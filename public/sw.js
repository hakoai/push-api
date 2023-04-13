self.addEventListener('push', evt => {
    const data = evt.data.json();
    console.log(data);
    const title = data.title;
    const options = {
        tag: "",
        body: "",
        icon: "https://push-api-hakoai.vercel.app/icon-192.png"
    }
    evt.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', evt => {
    evt.notification.close();
});
