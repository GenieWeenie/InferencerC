import { parseWindowState } from '../src/main/windowStateParser';

describe('window state parser', () => {
  it('parses valid persisted window state', () => {
    expect(parseWindowState(JSON.stringify({
      x: 100,
      y: 80,
      width: 1280,
      height: 820,
      isMaximized: true,
      isFullscreen: false,
    }))).toEqual({
      x: 100,
      y: 80,
      width: 1280,
      height: 820,
      isMaximized: true,
      isFullscreen: false,
    });
  });

  it('rejects invalid or non-finite required dimensions', () => {
    expect(parseWindowState('{bad-json')).toBeNull();
    expect(parseWindowState(JSON.stringify({ width: '1200', height: 800 }))).toBeNull();
    expect(parseWindowState('{"width":1200,"height":1e309}')).toBeNull();
  });

  it('drops invalid optional fields while preserving valid core fields', () => {
    expect(parseWindowState('{"x":1e309,"y":-20,"width":1200,"height":700,"isFullscreen":"yes"}')).toEqual({
      y: -20,
      width: 1200,
      height: 700,
    });
  });
});
