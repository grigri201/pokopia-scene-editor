export const unsafeScriptText = '<script>alert(1)</script>';
export const unsafeImageText = '<img src=x onerror=alert(1)>';
export const unsafeAngleText = 'Use <angle brackets> as plain text.';
export const unsafeCombinedText = `${unsafeScriptText}${unsafeImageText}`;
