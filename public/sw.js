self.addEventListener('push', evt => {
    const data = evt.data.json();
    console.log(data);
    const title = data.title;
    const options = {
        body: data.body
    }
    evt.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', evt => {
    evt.notification.close();
});
