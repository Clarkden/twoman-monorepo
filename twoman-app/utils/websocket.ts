class MessageHandler {
  private subscriptions: { [messageType: string]: Function[] } = {};

  subscribe(messageType: string, callback: Function) {
    if (!this.subscriptions[messageType]) {
      this.subscriptions[messageType] = [];
    }
    this.subscriptions[messageType].push(callback);
  }

  unsubscribe(messageType: string, callback: Function) {
    if (this.subscriptions[messageType]) {
      this.subscriptions[messageType] = this.subscriptions[messageType].filter(
        (cb) => cb !== callback
      );
    }
  }

  dispatch(messageType: string, data: any) {
    if (this.subscriptions[messageType]) {
      this.subscriptions[messageType].forEach((callback) => callback(data));
    }
  }
}

export const messageHandler = new MessageHandler();
