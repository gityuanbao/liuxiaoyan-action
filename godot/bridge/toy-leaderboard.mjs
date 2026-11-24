const BOARD = 1;
const TOP = 10;
const MAX_SCORE = 16777215;
const RANK_REQUEST = Object.freeze({board:BOARD, period:'all'});
const RANK_CACHE_MS = 45_000;
const SCORE_DELAY_MS = 60_000;

const loginErrors = new Set(['unauthorized','not_logged_in','not_login']);
const failureText = error => Number(error?.code) === 307044 ? '排行榜请求较多，请稍后再试。'
  : loginErrors.has(error?.type) || loginErrors.has(error?.code) ? '请登录 B 站后再试。'
  : error?.type === 'denied' ? '暂未授权排行榜成绩。'
  : '暂时无法连接排行榜，请稍后再试。';

const safeText = (value, length) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,length) : '';
const validScore = score => Number.isInteger(score) && score >= 0 && score <= MAX_SCORE;

function normalizeRows(response) {
  if (!Array.isArray(response)) throw Error('未收到排行榜数据。');
  const seen = new Set();
  const rows = [];
  for (const {rank, score, nickname, avatar} of response.filter(row => row && typeof row === 'object')) {
    if (!Number.isInteger(rank) || rank < 1 || rank > TOP || seen.has(rank) || !validScore(score)) continue;
    seen.add(rank);
    rows.push({rank, score, nickname:safeText(nickname,64) || 'B站玩家', avatar:safeText(avatar,1024)});
  }
  return rows.sort((a,b) => a.rank-b.rank);
}

function normalizeMine(response) {
  if (typeof response?.ranked !== 'boolean') return null;
  if (!response.ranked) return {ranked:false, rank:0, score:0};
  if (!Number.isInteger(response.rank) || response.rank < 1 || !validScore(response.score)) return null;
  return {ranked:true, rank:response.rank, score:response.score};
}

async function supported(sdk, ability) {
  if (typeof sdk[ability] !== 'function') return false;
  return typeof sdk.isSupport !== 'function' || Boolean(await sdk.isSupport(ability));
}

export function createToyLeaderboard({getContext, getScore, getWorship, sendWorship, now = Date.now}) {
  let cache = null;
  let cacheUntil = 0;
  let readPending, submitPending;
  let worshipPending = false;
  let lastSubmitted = -1;
  let consentThisSession = false;
  let nextSubmitAt = 0;
  let requestBlockedUntil = 0;
  let rateFailures = 0;

  function limited(error) {
    if (Number(error?.code) !== 307044) return;
    requestBlockedUntil = now()+30_000*2**Math.min(rateFailures++,3);
  }

  function view(base, message=base.message??'', overrideWorship=null) {
    const worship = overrideWorship ?? getWorship?.() ?? null;
    return {status:base.status, items:base.items??[], mine:base.mine??null, message,
      canSubmit:base.status==='ok' && base.submitSupported===true,
      canWorship:base.status==='ok' && base.mine!=null && worship?.available===true,
      worship};
  }

  async function read(force=false) {
    const context = getContext();
    if (!context?.sdk) return {status:'unsupported', message:context?.message ?? '排行榜仅在已登录的 B 站 Toy 正式版开放。'};
    if (now() < requestBlockedUntil) return {...cache, status:'error', message:'排行榜请求较多，请稍后再试。'};
    if (readPending) return readPending;
    if (!force && cache && now()<cacheUntil) return cache;
    const {sdk} = context;
    readPending = (async () => {
      try {
        const [listSupported,mineSupported,submitSupported] = await Promise.all(['getRankList','getMyRank','submitScore'].map(name => supported(sdk,name)));
        if (!listSupported) return {status:'unsupported', message:'当前 B 站 Toy 环境未开放排行榜。'};
        const [list,mine] = await Promise.allSettled([
          sdk.getRankList({...RANK_REQUEST,limit:TOP}),
          mineSupported ? sdk.getMyRank(RANK_REQUEST) : null,
        ]);
        if (list.status==='rejected') throw list.reason;
        if (mine.status==='rejected') limited(mine.reason);
        if (now() >= requestBlockedUntil) rateFailures = 0;
        const items = normalizeRows(list.value);
        const own = mine.status==='fulfilled' ? normalizeMine(mine.value) : null;
        return {status:'ok', items, mine:own, submitSupported,
          message:mine.status==='rejected' ? failureText(mine.reason) : ''};
      } catch (error) {
        limited(error);
        return {status:'error',message:failureText(error)};
      }
    })();
    try {
      cache = await readPending;
      cacheUntil = now() + (cache.status==='error' ? 8_000 : RANK_CACHE_MS);
      return cache;
    } finally { readPending=null; }
  }

  function score() {
    const value = Number(getScore());
    return Math.min(MAX_SCORE,Math.max(0,Number.isFinite(value) ? Math.floor(value) : 0));
  }

  async function submit(interactive) {
    const context = getContext();
    if (!context?.sdk || !cache?.submitSupported) return view(await read());
    if (submitPending) return submitPending;
    const current = score();
    const best = Math.max(lastSubmitted,cache.mine?.ranked ? cache.mine.score : -1);
    if (current <= best) return view(cache,'当前经验已经登记。');
    if (now()<requestBlockedUntil || now()<nextSubmitAt) return view(cache,'请稍后再同步新成绩。');
    nextSubmitAt = now()+SCORE_DELAY_MS;
    submitPending = (async () => {
      try {
        // An explicit click calls the SDK immediately so its first consent can use the user gesture.
        const acknowledged = await context.sdk.submitScore({board:BOARD,score:current});
        if (!validScore(acknowledged?.score)) throw Error('未收到成绩确认。');
        lastSubmitted = acknowledged.score;
        consentThisSession = true;
        // Follow-up reads happen for a visible interaction only.
        cacheUntil = 0;
        if (interactive) {
          const refreshed = await read(true);
          return view(refreshed,refreshed.status==='ok'?'成绩已同步。':'成绩已提交，榜单暂未刷新。');
        }
        return view(cache);
      } catch (error) {
        limited(error);
        if (loginErrors.has(error?.type) || error?.type === 'denied') consentThisSession = false;
        return view(cache,failureText(error));
      }
    })();
    try { return await submitPending; } finally { submitPending=null; }
  }

  async function worship(rank) {
    if (worshipPending) return view(await read(),'正在处理本次膜拜。');
    worshipPending = true;
    try {
      const previous = cache?.items?.find(item => item.rank===rank);
      const board = await read();
      const available = view(board);
      if (!available.canWorship) return available;
      const player = board.items.find(item => item.rank===rank);
      if (!player || (board.mine.ranked && board.mine.rank===rank))
        return view(board,'请选择榜单里的其他玩家。');
      if (!previous || previous.score!==player.score || previous.nickname!==player.nickname || previous.avatar!==player.avatar)
        return view(board,'排行榜已有更新，请重新选择一位玩家。');
      const result = await sendWorship(rank);
      const earned = result.reward;
      return view(board,`膜拜完成，你获得 ${earned} 哈弗币。`,{...result,earned});
    } catch (error) {
      return view(cache??{status:'error'},error?.message || '膜拜未能完成，请稍后再试。');
    } finally { worshipPending=false; }
  }

  function respond(promise, callback) {
    Promise.resolve(promise)
      .catch(error => view({status:'error'},failureText(error)))
      .then(result => callback(JSON.stringify(result))).catch(() => {});
  }

  return {
    refresh:callback => respond(read().then(board=>view(board)),callback),
    submit:callback => respond(submit(true),callback),
    worship:(rank, callback) => respond(worship(rank),callback),
    onSettled() {
      if (consentThisSession && !submitPending && now() >= nextSubmitAt && score() > lastSubmitted) void submit(false);
    },
  };
}
