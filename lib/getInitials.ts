/**
 * Derive initials from a display name or email (for avatars).
 * @param {string} [name] - Full name, e.g. "María Castro"
 * @param {string} [email] - Fallback when name is empty, e.g. "maria@example.com"
 * @returns {string} Up to 2 uppercase letters, e.g. "MC" or "M"
 */
export const getInitials = (name, email = '') => {
  const str = (name || '').trim();
  if (str.length > 0) {
    const parts = str.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  const emailStr = (email || '').trim();
  if (emailStr.length > 0) {
    const local = emailStr.split('@')[0] || '';
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    if (local.length === 1) return local[0].toUpperCase();
  }
  return '?';
};
