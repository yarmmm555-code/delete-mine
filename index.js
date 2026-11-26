(function (exports) {
  "use strict";
  const { findByProps, findByStoreName } = vendetta.metro;
  const { React, ReactNative } = vendetta.metro.common;
  const { Forms } = vendetta.ui.components;
  const { showConfirmationAlert } = vendetta.ui.alerts;
  const { showToast } = vendetta.ui.toasts;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let running = false;
  let stop = false;

  const run = async () => {
    const RestAPI = findByProps("getAPIBaseURL", "get");
    const MessageStore = findByStoreName("MessageStore");
    const UserStore = findByStoreName("UserStore");
    const SelectedChannelStore = findByStoreName("SelectedChannelStore");

    const channelId = SelectedChannelStore.getChannelId();
    const me = UserStore.getCurrentUser().id;
    if (!channelId) return showToast("Open a channel first");

    const mine = MessageStore.getMessages(channelId)
      .toArray()
      .filter((m) => m.author && m.author.id === me);

    if (!mine.length) return showToast("No loaded messages of yours");

    running = true;
    stop = false;
    let done = 0;
    for (const m of mine) {
      if (stop) break;
      try {
        await RestAPI.del({ url: "/channels/" + channelId + "/messages/" + m.id });
        done++;
      } catch (e) {
        if (e && e.status === 429) await sleep(5000);
      }
      await sleep(1200);
    }
    running = false;
    showToast("Deleted " + done + " / " + mine.length);
  };

  const Settings = () =>
    React.createElement(
      ReactNative.ScrollView,
      null,
      React.createElement(Forms.FormRow, {
        label: "Delete my messages in this channel",
        onPress: () => {
          if (running) return showToast("Already running");
          showConfirmationAlert({
            title: "Delete my messages",
            content: "Delete your loaded messages in the current channel?",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: run,
          });
        },
      }),
      React.createElement(Forms.FormRow, {
        label: "Stop",
        onPress: () => { stop = true; },
      })
    );

  exports.settings = Settings;
  exports.onLoad = () => {};
  exports.onUnload = () => { stop = true; };
  return exports;
})({});
