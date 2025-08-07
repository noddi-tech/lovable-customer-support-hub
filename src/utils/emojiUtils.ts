// Emoji utilities for converting shortcodes and handling emoji data
export interface EmojiData {
  emoji: string;
  name: string;
  shortcode: string;
  category: string;
}

// Common emoji shortcodes map
export const emojiShortcodes: Record<string, string> = {
  // Smileys & Emotion
  ':smile:': '😄',
  ':grinning:': '😀',
  ':blush:': '😊',
  ':smiley:': '😃',
  ':relaxed:': '☺️',
  ':smirk:': '😏',
  ':heart_eyes:': '😍',
  ':kissing_heart:': '😘',
  ':kissing_closed_eyes:': '😚',
  ':flushed:': '😳',
  ':relieved:': '😌',
  ':satisfied:': '😆',
  ':grin:': '😁',
  ':wink:': '😉',
  ':stuck_out_tongue_winking_eye:': '😜',
  ':stuck_out_tongue_closed_eyes:': '😝',
  ':kissing:': '😗',
  ':kissing_smiling_eyes:': '😙',
  ':stuck_out_tongue:': '😛',
  ':sleeping:': '😴',
  ':worried:': '😟',
  ':frowning:': '😦',
  ':anguished:': '😧',
  ':open_mouth:': '😮',
  ':grimacing:': '😬',
  ':confused:': '😕',
  ':hushed:': '😯',
  ':expressionless:': '😑',
  ':unamused:': '😒',
  ':sweat_smile:': '😅',
  ':sweat:': '😓',
  ':disappointed_relieved:': '😥',
  ':weary:': '😩',
  ':pensive:': '😔',
  ':disappointed:': '😞',
  ':confounded:': '😖',
  ':fearful:': '😨',
  ':cold_sweat:': '😰',
  ':persevere:': '😣',
  ':cry:': '😢',
  ':sob:': '😭',
  ':joy:': '😂',
  ':astonished:': '😲',
  ':scream:': '😱',
  ':tired_face:': '😫',
  ':angry:': '😠',
  ':rage:': '😡',
  ':triumph:': '😤',
  ':sleepy:': '😪',
  ':yum:': '😋',
  ':mask:': '😷',
  ':sunglasses:': '😎',
  ':dizzy_face:': '😵',
  ':imp:': '👿',
  ':smiling_imp:': '😈',
  ':neutral_face:': '😐',
  ':no_mouth:': '😶',
  ':innocent:': '😇',
  ':alien:': '👽',
  
  // Gestures & Body Parts
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':ok_hand:': '👌',
  ':punch:': '👊',
  ':fist:': '✊',
  ':v:': '✌️',
  ':wave:': '👋',
  ':hand:': '✋',
  ':raised_hand:': '✋',
  ':open_hands:': '👐',
  ':point_up:': '☝️',
  ':point_down:': '👇',
  ':point_left:': '👈',
  ':point_right:': '👉',
  ':raised_hands:': '🙌',
  ':pray:': '🙏',
  ':clap:': '👏',
  ':muscle:': '💪',
  
  // Hearts & Love
  ':heart:': '❤️',
  ':broken_heart:': '💔',
  ':two_hearts:': '💕',
  ':sparkling_heart:': '💖',
  ':heartpulse:': '💗',
  ':heartbeat:': '💓',
  ':revolving_hearts:': '💞',
  ':cupid:': '💘',
  ':blue_heart:': '💙',
  ':green_heart:': '💚',
  ':yellow_heart:': '💛',
  ':purple_heart:': '💜',
  ':gift_heart:': '💝',
  ':heart_decoration:': '💟',
  
  // Symbols & Objects
  ':fire:': '🔥',
  ':star:': '⭐',
  ':star2:': '🌟',
  ':sparkles:': '✨',
  ':zap:': '⚡',
  ':boom:': '💥',
  ':tada:': '🎉',
  ':confetti_ball:': '🎊',
  ':balloon:': '🎈',
  ':gift:': '🎁',
  ':trophy:': '🏆',
  ':medal:': '🏅',
  ':soccer:': '⚽',
  ':basketball:': '🏀',
  ':football:': '🏈',
  ':baseball:': '⚾',
  ':tennis:': '🎾',
  ':8ball:': '🎱',
  ':rugby_football:': '🏉',
  ':bowling:': '🎳',
  
  // Tech & Communication
  ':email:': '📧',
  ':e-mail:': '📧',
  ':mailbox:': '📬',
  ':mailbox_closed:': '📪',
  ':mailbox_with_mail:': '📬',
  ':mailbox_with_no_mail:': '📭',
  ':postbox:': '📮',
  ':phone:': '☎️',
  ':telephone:': '☎️',
  ':telephone_receiver:': '📞',
  ':pager:': '📟',
  ':fax:': '📠',
  ':satellite:': '📡',
  ':loudspeaker:': '📢',
  ':mega:': '📣',
  ':outbox_tray:': '📤',
  ':inbox_tray:': '📥',
  ':package:': '📦',
  ':computer:': '💻',
  ':desktop_computer:': '🖥️',
  ':keyboard:': '⌨️',
  ':computer_mouse:': '🖱️',
  ':trackball:': '🖲️',
  ':joystick:': '🕹️',
  ':compression:': '🗜️',
  ':minidisc:': '💽',
  ':floppy_disk:': '💾',
  ':cd:': '💿',
  ':dvd:': '📀',
  ':vhs:': '📼',
  ':camera:': '📷',
  ':camera_flash:': '📸',
  ':video_camera:': '📹',
  ':movie_camera:': '🎥',
  ':film_projector:': '📽️',
  ':film_strip:': '🎞️',
  ':tv:': '📺',
  ':radio:': '📻',
  ':studio_microphone:': '🎙️',
  ':level_slider:': '🎚️',
  ':control_knobs:': '🎛️',
  ':microphone:': '🎤',
  ':headphones:': '🎧',
  ':musical_note:': '🎵',
  ':notes:': '🎶',
  ':musical_keyboard:': '🎹',
  ':violin:': '🎻',
  ':trumpet:': '🎺',
  ':saxophone:': '🎷',
  ':guitar:': '🎸',
  ':musical_score:': '🎼',
  
  // Weather & Nature
  ':sunny:': '☀️',
  ':cloud:': '☁️',
  ':partly_sunny:': '⛅',
  ':cloudy:': '☁️',
  ':rain_cloud:': '🌧️',
  ':snow_cloud:': '🌨️',
  ':lightning:': '⚡',
  ':snowflake:': '❄️',
  ':rainbow:': '🌈',
  ':ocean:': '🌊',
  
  // Time & Calendar
  ':clock1:': '🕐',
  ':clock2:': '🕑',
  ':clock3:': '🕒',
  ':clock4:': '🕓',
  ':clock5:': '🕔',
  ':clock6:': '🕕',
  ':clock7:': '🕖',
  ':clock8:': '🕗',
  ':clock9:': '🕘',
  ':clock10:': '🕙',
  ':clock11:': '🕚',
  ':clock12:': '🕛',
  ':calendar:': '📅',
  ':date:': '📅',
  
  // Transportation
  ':car:': '🚗',
  ':taxi:': '🚕',
  ':bus:': '🚌',
  ':train:': '🚆',
  ':airplane:': '✈️',
  ':rocket:': '🚀',
  ':helicopter:': '🚁',
  ':ship:': '🚢',
  ':sailboat:': '⛵',
  ':speedboat:': '🚤',
  ':bike:': '🚲',
  ':scooter:': '🛴',
  ':motor_scooter:': '🛵',
  ':motorcycle:': '🏍️',
  ':truck:': '🚚',
  ':articulated_lorry:': '🚛',
  ':tractor:': '🚜',
  
  // Flags (common ones)
  ':flag_no:': '🇳🇴',
  ':flag_us:': '🇺🇸',
  ':flag_gb:': '🇬🇧',
  ':flag_de:': '🇩🇪',
  ':flag_fr:': '🇫🇷',
  ':flag_es:': '🇪🇸',
  ':flag_it:': '🇮🇹',
  ':flag_jp:': '🇯🇵',
  ':flag_cn:': '🇨🇳',
  ':flag_kr:': '🇰🇷',
  ':flag_in:': '🇮🇳',
  ':flag_ca:': '🇨🇦',
  ':flag_au:': '🇦🇺',
  ':flag_br:': '🇧🇷',
  ':flag_mx:': '🇲🇽',
  
  // Common symbols
  ':white_check_mark:': '✅',
  ':x:': '❌',
  ':heavy_check_mark:': '✔️',
  ':heavy_multiplication_x:': '✖️',
  ':question:': '❓',
  ':grey_question:': '❔',
  ':exclamation:': '❗',
  ':grey_exclamation:': '❕',
  ':warning:': '⚠️',
  ':no_entry:': '⛔',
  ':no_entry_sign:': '🚫',
  ':red_circle:': '🔴',
  ':orange_circle:': '🟠',
  ':yellow_circle:': '🟡',
  ':green_circle:': '🟢',
  ':blue_circle:': '🔵',
  ':purple_circle:': '🟣',
  ':brown_circle:': '🟤',
  ':black_circle:': '⚫',
  ':white_circle:': '⚪'
};

// Categories for organizing emojis
export const emojiCategories = {
  'Smileys & People': [
    { emoji: '😀', name: 'grinning', shortcode: ':grinning:' },
    { emoji: '😃', name: 'smiley', shortcode: ':smiley:' },
    { emoji: '😄', name: 'smile', shortcode: ':smile:' },
    { emoji: '😁', name: 'grin', shortcode: ':grin:' },
    { emoji: '😆', name: 'laughing', shortcode: ':satisfied:' },
    { emoji: '😅', name: 'sweat_smile', shortcode: ':sweat_smile:' },
    { emoji: '😂', name: 'joy', shortcode: ':joy:' },
    { emoji: '😊', name: 'blush', shortcode: ':blush:' },
    { emoji: '😇', name: 'innocent', shortcode: ':innocent:' },
    { emoji: '😉', name: 'wink', shortcode: ':wink:' },
    { emoji: '😌', name: 'relieved', shortcode: ':relieved:' },
    { emoji: '😍', name: 'heart_eyes', shortcode: ':heart_eyes:' },
    { emoji: '😘', name: 'kissing_heart', shortcode: ':kissing_heart:' },
    { emoji: '😗', name: 'kissing', shortcode: ':kissing:' },
    { emoji: '😙', name: 'kissing_smiling_eyes', shortcode: ':kissing_smiling_eyes:' },
    { emoji: '😚', name: 'kissing_closed_eyes', shortcode: ':kissing_closed_eyes:' },
    { emoji: '😎', name: 'sunglasses', shortcode: ':sunglasses:' },
    { emoji: '😏', name: 'smirk', shortcode: ':smirk:' },
    { emoji: '😐', name: 'neutral_face', shortcode: ':neutral_face:' },
    { emoji: '😑', name: 'expressionless', shortcode: ':expressionless:' },
    { emoji: '😒', name: 'unamused', shortcode: ':unamused:' },
    { emoji: '😓', name: 'sweat', shortcode: ':sweat:' },
    { emoji: '😔', name: 'pensive', shortcode: ':pensive:' },
    { emoji: '😕', name: 'confused', shortcode: ':confused:' },
    { emoji: '😖', name: 'confounded', shortcode: ':confounded:' },
    { emoji: '😛', name: 'stuck_out_tongue', shortcode: ':stuck_out_tongue:' },
    { emoji: '😜', name: 'stuck_out_tongue_winking_eye', shortcode: ':stuck_out_tongue_winking_eye:' },
    { emoji: '😝', name: 'stuck_out_tongue_closed_eyes', shortcode: ':stuck_out_tongue_closed_eyes:' },
    { emoji: '😞', name: 'disappointed', shortcode: ':disappointed:' },
    { emoji: '😟', name: 'worried', shortcode: ':worried:' },
    { emoji: '😠', name: 'angry', shortcode: ':angry:' },
    { emoji: '😡', name: 'rage', shortcode: ':rage:' },
    { emoji: '😢', name: 'cry', shortcode: ':cry:' },
    { emoji: '😣', name: 'persevere', shortcode: ':persevere:' },
    { emoji: '😤', name: 'triumph', shortcode: ':triumph:' },
    { emoji: '😥', name: 'disappointed_relieved', shortcode: ':disappointed_relieved:' },
    { emoji: '😦', name: 'frowning', shortcode: ':frowning:' },
    { emoji: '😧', name: 'anguished', shortcode: ':anguished:' },
    { emoji: '😨', name: 'fearful', shortcode: ':fearful:' },
    { emoji: '😩', name: 'weary', shortcode: ':weary:' },
    { emoji: '😪', name: 'sleepy', shortcode: ':sleepy:' },
    { emoji: '😫', name: 'tired_face', shortcode: ':tired_face:' },
    { emoji: '😬', name: 'grimacing', shortcode: ':grimacing:' },
    { emoji: '😭', name: 'sob', shortcode: ':sob:' },
    { emoji: '😮', name: 'open_mouth', shortcode: ':open_mouth:' },
    { emoji: '😯', name: 'hushed', shortcode: ':hushed:' },
    { emoji: '😰', name: 'cold_sweat', shortcode: ':cold_sweat:' },
    { emoji: '😱', name: 'scream', shortcode: ':scream:' },
    { emoji: '😲', name: 'astonished', shortcode: ':astonished:' },
    { emoji: '😳', name: 'flushed', shortcode: ':flushed:' },
    { emoji: '😴', name: 'sleeping', shortcode: ':sleeping:' },
    { emoji: '😵', name: 'dizzy_face', shortcode: ':dizzy_face:' },
    { emoji: '😶', name: 'no_mouth', shortcode: ':no_mouth:' },
    { emoji: '😷', name: 'mask', shortcode: ':mask:' },
    { emoji: '👍', name: 'thumbsup', shortcode: ':thumbsup:' },
    { emoji: '👎', name: 'thumbsdown', shortcode: ':thumbsdown:' },
    { emoji: '👌', name: 'ok_hand', shortcode: ':ok_hand:' },
    { emoji: '👊', name: 'punch', shortcode: ':punch:' },
    { emoji: '✊', name: 'fist', shortcode: ':fist:' },
    { emoji: '✌️', name: 'v', shortcode: ':v:' },
    { emoji: '👋', name: 'wave', shortcode: ':wave:' },
    { emoji: '✋', name: 'hand', shortcode: ':hand:' },
    { emoji: '👐', name: 'open_hands', shortcode: ':open_hands:' },
    { emoji: '☝️', name: 'point_up', shortcode: ':point_up:' },
    { emoji: '👇', name: 'point_down', shortcode: ':point_down:' },
    { emoji: '👈', name: 'point_left', shortcode: ':point_left:' },
    { emoji: '👉', name: 'point_right', shortcode: ':point_right:' },
    { emoji: '🙌', name: 'raised_hands', shortcode: ':raised_hands:' },
    { emoji: '🙏', name: 'pray', shortcode: ':pray:' },
    { emoji: '👏', name: 'clap', shortcode: ':clap:' },
    { emoji: '💪', name: 'muscle', shortcode: ':muscle:' }
  ],
  'Hearts & Symbols': [
    { emoji: '❤️', name: 'heart', shortcode: ':heart:' },
    { emoji: '💔', name: 'broken_heart', shortcode: ':broken_heart:' },
    { emoji: '💕', name: 'two_hearts', shortcode: ':two_hearts:' },
    { emoji: '💖', name: 'sparkling_heart', shortcode: ':sparkling_heart:' },
    { emoji: '💗', name: 'heartpulse', shortcode: ':heartpulse:' },
    { emoji: '💓', name: 'heartbeat', shortcode: ':heartbeat:' },
    { emoji: '💞', name: 'revolving_hearts', shortcode: ':revolving_hearts:' },
    { emoji: '💘', name: 'cupid', shortcode: ':cupid:' },
    { emoji: '💙', name: 'blue_heart', shortcode: ':blue_heart:' },
    { emoji: '💚', name: 'green_heart', shortcode: ':green_heart:' },
    { emoji: '💛', name: 'yellow_heart', shortcode: ':yellow_heart:' },
    { emoji: '💜', name: 'purple_heart', shortcode: ':purple_heart:' },
    { emoji: '💝', name: 'gift_heart', shortcode: ':gift_heart:' },
    { emoji: '💟', name: 'heart_decoration', shortcode: ':heart_decoration:' },
    { emoji: '⭐', name: 'star', shortcode: ':star:' },
    { emoji: '🌟', name: 'star2', shortcode: ':star2:' },
    { emoji: '✨', name: 'sparkles', shortcode: ':sparkles:' },
    { emoji: '⚡', name: 'zap', shortcode: ':zap:' },
    { emoji: '🔥', name: 'fire', shortcode: ':fire:' },
    { emoji: '💥', name: 'boom', shortcode: ':boom:' },
    { emoji: '✅', name: 'white_check_mark', shortcode: ':white_check_mark:' },
    { emoji: '❌', name: 'x', shortcode: ':x:' },
    { emoji: '❓', name: 'question', shortcode: ':question:' },
    { emoji: '❗', name: 'exclamation', shortcode: ':exclamation:' },
    { emoji: '⚠️', name: 'warning', shortcode: ':warning:' }
  ],
  'Objects & Tech': [
    { emoji: '📧', name: 'email', shortcode: ':email:' },
    { emoji: '📬', name: 'mailbox_with_mail', shortcode: ':mailbox_with_mail:' },
    { emoji: '📪', name: 'mailbox_closed', shortcode: ':mailbox_closed:' },
    { emoji: '📞', name: 'telephone_receiver', shortcode: ':telephone_receiver:' },
    { emoji: '☎️', name: 'phone', shortcode: ':phone:' },
    { emoji: '📱', name: 'iphone', shortcode: ':iphone:' },
    { emoji: '💻', name: 'computer', shortcode: ':computer:' },
    { emoji: '🖥️', name: 'desktop_computer', shortcode: ':desktop_computer:' },
    { emoji: '⌨️', name: 'keyboard', shortcode: ':keyboard:' },
    { emoji: '🖱️', name: 'computer_mouse', shortcode: ':computer_mouse:' },
    { emoji: '📷', name: 'camera', shortcode: ':camera:' },
    { emoji: '📹', name: 'video_camera', shortcode: ':video_camera:' },
    { emoji: '📺', name: 'tv', shortcode: ':tv:' },
    { emoji: '📻', name: 'radio', shortcode: ':radio:' },
    { emoji: '🎵', name: 'musical_note', shortcode: ':musical_note:' },
    { emoji: '🎶', name: 'notes', shortcode: ':notes:' },
    { emoji: '🎤', name: 'microphone', shortcode: ':microphone:' },
    { emoji: '🎧', name: 'headphones', shortcode: ':headphones:' },
    { emoji: '🎬', name: 'clapper', shortcode: ':clapper:' },
    { emoji: '🎮', name: 'video_game', shortcode: ':video_game:' }
  ],
  'Travel & Places': [
    { emoji: '🚗', name: 'car', shortcode: ':car:' },
    { emoji: '🚕', name: 'taxi', shortcode: ':taxi:' },
    { emoji: '🚌', name: 'bus', shortcode: ':bus:' },
    { emoji: '🚆', name: 'train', shortcode: ':train:' },
    { emoji: '✈️', name: 'airplane', shortcode: ':airplane:' },
    { emoji: '🚀', name: 'rocket', shortcode: ':rocket:' },
    { emoji: '🚁', name: 'helicopter', shortcode: ':helicopter:' },
    { emoji: '🚢', name: 'ship', shortcode: ':ship:' },
    { emoji: '⛵', name: 'sailboat', shortcode: ':sailboat:' },
    { emoji: '🚲', name: 'bike', shortcode: ':bike:' },
    { emoji: '🏍️', name: 'motorcycle', shortcode: ':motorcycle:' },
    { emoji: '🚚', name: 'truck', shortcode: ':truck:' },
    { emoji: '🚜', name: 'tractor', shortcode: ':tractor:' },
    { emoji: '🛴', name: 'scooter', shortcode: ':scooter:' },
    { emoji: '🛵', name: 'motor_scooter', shortcode: ':motor_scooter:' }
  ],
  'Activities & Events': [
    { emoji: '🎉', name: 'tada', shortcode: ':tada:' },
    { emoji: '🎊', name: 'confetti_ball', shortcode: ':confetti_ball:' },
    { emoji: '🎈', name: 'balloon', shortcode: ':balloon:' },
    { emoji: '🎁', name: 'gift', shortcode: ':gift:' },
    { emoji: '🏆', name: 'trophy', shortcode: ':trophy:' },
    { emoji: '🏅', name: 'medal', shortcode: ':medal:' },
    { emoji: '⚽', name: 'soccer', shortcode: ':soccer:' },
    { emoji: '🏀', name: 'basketball', shortcode: ':basketball:' },
    { emoji: '🏈', name: 'football', shortcode: ':football:' },
    { emoji: '⚾', name: 'baseball', shortcode: ':baseball:' },
    { emoji: '🎾', name: 'tennis', shortcode: ':tennis:' },
    { emoji: '🎱', name: '8ball', shortcode: ':8ball:' },
    { emoji: '🏉', name: 'rugby_football', shortcode: ':rugby_football:' },
    { emoji: '🎳', name: 'bowling', shortcode: ':bowling:' }
  ]
};

/**
 * Convert text with emoji shortcodes to actual emojis
 * Example: ":smile: Hello :heart:" becomes "😄 Hello ❤️"
 */
export const convertShortcodesToEmojis = (text: string): string => {
  let convertedText = text;
  
  // Replace all shortcode patterns with corresponding emojis
  Object.entries(emojiShortcodes).forEach(([shortcode, emoji]) => {
    const regex = new RegExp(escapeRegExp(shortcode), 'g');
    convertedText = convertedText.replace(regex, emoji);
  });
  
  return convertedText;
};

/**
 * Convert emojis back to shortcodes
 * Example: "😄 Hello ❤️" becomes ":smile: Hello :heart:"
 */
export const convertEmojisToShortcodes = (text: string): string => {
  let convertedText = text;
  
  // Create reverse mapping
  const emojiToShortcode: Record<string, string> = {};
  Object.entries(emojiShortcodes).forEach(([shortcode, emoji]) => {
    emojiToShortcode[emoji] = shortcode;
  });
  
  // Replace all emojis with corresponding shortcodes
  Object.entries(emojiToShortcode).forEach(([emoji, shortcode]) => {
    const regex = new RegExp(escapeRegExp(emoji), 'g');
    convertedText = convertedText.replace(regex, shortcode);
  });
  
  return convertedText;
};

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get emoji suggestions based on partial shortcode input
 */
export const getEmojiSuggestions = (partialShortcode: string): EmojiData[] => {
  const suggestions: EmojiData[] = [];
  const searchTerm = partialShortcode.toLowerCase();
  
  Object.entries(emojiShortcodes).forEach(([shortcode, emoji]) => {
    if (shortcode.toLowerCase().includes(searchTerm)) {
      const name = shortcode.replace(/:/g, '');
      suggestions.push({
        emoji,
        name,
        shortcode,
        category: getCategoryForEmoji(emoji)
      });
    }
  });
  
  return suggestions.slice(0, 10); // Limit to 10 suggestions
};

/**
 * Get category for a specific emoji
 */
function getCategoryForEmoji(emoji: string): string {
  for (const [category, emojis] of Object.entries(emojiCategories)) {
    if (emojis.some(e => e.emoji === emoji)) {
      return category;
    }
  }
  return 'Other';
}

/**
 * Check if text contains any emoji shortcodes
 */
export const containsShortcodes = (text: string): boolean => {
  return Object.keys(emojiShortcodes).some(shortcode => 
    text.includes(shortcode)
  );
};