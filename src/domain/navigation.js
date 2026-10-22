// Rows contain only currently visible controls; physical edges never wrap.
export function navigate(rows, current, direction) {
  if (!rows.length) return null;
  let row = rows.findIndex(items => items.indexOf(current) !== -1);
  if (row < 0) return rows[0][0] || null;
  const column = rows[row].indexOf(current);
  if (direction === 'left' || direction === 'right') {
    return rows[row][Math.max(0, Math.min(rows[row].length - 1, column + (direction === 'left' ? -1 : 1)))];
  }
  const nextRow = Math.max(0, Math.min(rows.length - 1, row + (direction === 'up' ? -1 : 1)));
  return rows[nextRow][Math.min(column, rows[nextRow].length - 1)] || current;
}

export function keyAction(event) {
  const codes = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'select', 461: 'back', 27: 'back', 8: 'back' };
  const keys = { ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', Enter: 'select', Escape: 'back', Backspace: 'back' };
  return keys[event.key] || codes[event.keyCode] || null;
}
