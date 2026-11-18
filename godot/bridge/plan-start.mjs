// One UI request: no intermediate snapshot can replace a pressed mobile button.
// Session commands, learning rules and storage format stay unchanged.
export function startSavedPlan(session, {id, batch, goal, answerMode}) {
  if (session.state && !session.state.outcome) throw Error('请先继续当前行动。');
  if (!['spelling', 'choose_meaning', 'choose_word'].includes(answerMode)) throw Error('请选择答题方式。');
  session.command('book_plan_save', {id, batch, goal});
  session.command('study_settings', {answerMode});
  const plan = session.study.dailySelection(session.bookSettings.selected, session.profile);
  if (['learn', 'review'].includes(plan.action)) return session.command('daily_start');
  // A completed daily goal still permits the explicitly requested extra practice.
  if (plan.action === 'checkin') session.command('check_in');
  return session.command('study_start');
}
