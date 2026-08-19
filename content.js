function getVideos() {
  const found = new Map();
  // Vimeo'ın klasör kartlarında başlık bağlantısı bu test kimliğiyle işaretlenir.
  // Sınıf adları değişken olduğundan, CSS sınıfları yerine bu sabit kimlik kullanılır.
  const titleLinks = document.querySelectorAll('a[data-testid="content-card-title"][href]');

  for (const titleLink of titleLinks) {
    const href = new URL(titleLink.getAttribute('href'), location.origin);
    const videoMatch = href.pathname.match(/^\/manage\/videos\/(\d+)(?:\/|$)/);
    if (!videoMatch) continue;

    const id = videoMatch[1];
    const title = titleLink.textContent.replace(/\s+/g, ' ').trim();
    if (!title) continue;

    // Karttaki yönetim adresinden video kimliği alınır; hedef sistem için izleme bağlantısı üretilir.
    found.set(id, { title, url: `https://vimeo.com/${id}` });
  }

  return [...found.values()];
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_VIMEO_VIDEOS') {
    sendResponse({ videos: getVideos() });
  }
});
