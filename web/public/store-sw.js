self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  const title = typeof message.title === "string" ? message.title : "uYao Store";
  const body = typeof message.body === "string" ? message.body : "Store OS 有新的工作需要處理。";
  const tag = typeof message.tag === "string" ? message.tag : "store-os-work";
  const url = typeof message.url === "string" && message.url.startsWith("/") ? message.url : "/";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    icon: "/apple-icon.png",
    badge: "/brand/uyao-favicon-32.png",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
