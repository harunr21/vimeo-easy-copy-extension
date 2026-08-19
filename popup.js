const statusElement = document.querySelector('#status');
const listElement = document.querySelector('#video-list');
const template = document.querySelector('#video-template');
const refreshButton = document.querySelector('#refresh');

function setStatus(message) {
  statusElement.textContent = message;
}

function renderVideos(videos) {
  listElement.replaceChildren();

  for (const video of videos) {
    const row = template.content.cloneNode(true);
    const title = row.querySelector('.video-title');
    const link = row.querySelector('.video-link');
    const titleButton = row.querySelector('.copy-title-button');
    const linkButton = row.querySelector('.copy-link-button');

    title.textContent = video.title;
    link.textContent = video.url;
    link.href = video.url;
    addCopyAction(titleButton, video.title, 'İsim kopyalandı', 'İsmi kopyala');
    addCopyAction(linkButton, video.url, 'Link kopyalandı', 'Linki kopyala');

    listElement.append(row);
  }
}

function addCopyAction(button, value, copiedLabel, defaultLabel) {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(value);
    button.textContent = copiedLabel;
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = defaultLabel;
      button.classList.remove('copied');
    }, 1400);
  });
}

async function loadVideos() {
  setStatus('Vimeo sayfası okunuyor…');
  listElement.replaceChildren();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes('vimeo.com')) {
    setStatus('Önce Vimeo’daki video klasörü sayfasını açın.');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIMEO_VIDEOS' });
    const videos = response?.videos ?? [];
    if (!videos.length) {
      setStatus('Video bulunamadı. Vimeo sayfası henüz yüklenmemiş olabilir veya bu ekranın yapısı için uyarlama gerekebilir.');
      return;
    }
    renderVideos(videos);
    setStatus(`${videos.length} video bulundu. Her videonun ismini ve linkini ayrı ayrı kopyalayabilirsiniz.`);
  } catch {
    setStatus('Bu Vimeo sayfası okunamadı. Sayfayı yenileyip tekrar deneyin.');
  }
}

refreshButton.addEventListener('click', loadVideos);
loadVideos();
