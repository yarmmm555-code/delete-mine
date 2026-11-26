(function (exports) {
  "use strict";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let running = false;
  let stop = false;

  const toast = (t) => {
    try { vendetta.ui.toasts.showToast(String(t)); } catch (e) {}
  };

  const run = async () => {
    try {
      const { findByProps, findByStoreName } = vendetta.metro;
      const RestAPI = findByProps("getAPIBaseURL", "get");
      const MessageStore = findByStoreName("MessageStore");
      const UserStore = findByStoreName("UserStore");
      const SelectedChannelStore = findByStoreName("SelectedChannelStore");

      if (!RestAPI || !MessageStore || !UserStore || !SelectedChannelStore)
        return toast("Internal modules not found");

      const channelId = SelectedChannelStore.getChannelId();
      if (!channelId) return toast("Open a channel first");

      const me = UserStore.getCurrentUser().id;
      const mine = MessageStore.getMessages(channelId)
        .toArray()
        .filter((m) => m.author && m.author.id === me);
      if (!mine.length) return toast("No loaded messages of yours");

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
      toast("Deleted " + done + " / " + mine.length);
    } catch (e) {
      running = false;
      toast("Error: " + (e && e.message ? e.message : e));
    }
  };

  const Settings = () => {
    const { React, ReactNative } = vendetta.metro.common;
    const Forms =
      (vendetta.ui.components && vendetta.ui.components.Forms) ||
      vendetta.metro.findByProps("FormRow", "FormSection") ||
      {};
    const Row = Forms.FormRow;
    if (!Row) return React.createElement(ReactNative.Text, null, "FormRow not found");
    return React.createElement(
      ReactNative.ScrollView,
      null,
      React.createElement(Row, {
        label: "Delete my messages in this channel",
        onPress: () => {
          if (running) return toast("Already running");
          vendetta.ui.alerts.showConfirmationAlert({
            title: "Delete my messages",
            content: "Delete your loaded messages in the current channel?",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: run,
          });
        },
      }),
      React.createElement(Row, { label: "Stop", onPress: () => { stop = true; } })
    );
  };

  exports.settings = Settings;
  exports.onLoad = () => { toast("Delete My Messages ready"); };
  exports.onUnload = () => { stop = true; };
  return exports;
})({});
