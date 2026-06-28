// Log incoming WebSocket message details
// Append this to the DO's WebSocket message handler for debugging

export function logIncomingMessage(data: string) {
  const prefix = data.substring(0, 20)
  const startsWith = data.substring(0, 3)
  console.log('WS_MSG_IN: len=' + data.length + ' prefix=' + prefix + ' cg_?=' + (startsWith === 'cg_'))
}
