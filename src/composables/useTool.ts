
export function useTool() {

const showEmojiPicker = ref(false);
const emojiList = [
  "👍", "😂", "😅", "😍", "🤔", "🥹", "👏", "🔥", "😳", "🥲", "😭", "🤝", "🫶", "🙏",
  "💯", "😡", "😎", "🙌", "😉", "😐", "❤️", "💩", "🌈","😊"
]; 






  return {
   emojiList,
   showEmojiPicker,
   
  };
}

