exports.main = async (event, context) => {
  console.log('testSimple 已执行');
  return { success: true, received: event };
}