const statusElement = document.querySelector('#status');
const listElement = document.querySelector('#video-list');
const template = document.querySelector('#video-template');
const refreshButton = document.querySelector('#refresh');
const pinButton = document.querySelector('#pin');
const PINNED_VIDEOS_KEY = 'pinnedVideos';

let displayedVideos = [];
let isPinned = false;

function setStatus(message) {
  statusElement.textContent = message;
}

function renderVideos(videos) {
  listElement.replaceChildren();

  for (const video of videos) {
    const row = template.content.cloneNode(true);
    const card = row.querySelector('.video-row');
    const title = row.querySelector('.video-title');
    const link = row.querySelector('.video-link');
    const titleButton = row.querySelector('.copy-title-button');
    const linkButton = row.querySelector('.copy-link-button');

    title.textContent = video.title;
    link.textContent = video.url;
    link.href = video.url;
    updateCardState(card, video);
    addCopyAction(titleButton, video.title, 'İsim kopyalandı', 'İsmi kopyala', async () => {
      video.copiedTitle = true;
      updateCardState(card, video);
      await saveCopyProgress();
    });
    addCopyAction(linkButton, video.url, 'Link kopyalandı', 'Linki kopyala', async () => {
      video.copiedLink = true;
      updateCardState(card, video);
      await saveCopyProgress();
    });

    listElement.append(row);
  }
}

function updatePinButton() {
  pinButton.textContent = isPinned ? 'Sabitlemeyi kaldır' : 'Listeyi sabitle';
  pinButton.classList.toggle('is-pinned', isPinned);
  pinButton.setAttribute('aria-pressed', String(isPinned));
}

function updateCardState(card, video) {
  const isComplete = video.copiedTitle && video.copiedLink;
  const isPartial = video.copiedTitle || video.copiedLink;
  card.classList.toggle('copy-partial', isPartial && !isComplete);
  card.classList.toggle('copy-complete', isComplete);
}

async function saveCopyProgress() {
  if (isPinned) {
    await chrome.storage.local.set({ [PINNED_VIDEOS_KEY]: displayedVideos });
  }
}

function addCopyAction(button, value, copiedLabel, defaultLabel, afterCopy) {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(value);
    await afterCopy();
    button.textContent = copiedLabel;
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = defaultLabel;
      button.classList.remove('copied');
    }, 1400);
  });
}

function preserveCopyProgress(videos) {
  const previousStateByUrl = new Map(
    displayedVideos.map((video) => [video.url, {
      copiedTitle: Boolean(video.copiedTitle),
      copiedLink: Boolean(video.copiedLink)
    }])
  );

  return videos.map((video) => ({ ...video, ...previousStateByUrl.get(video.url) }));
}

async function captureVideosFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes('vimeo.com')) {
    return { error: 'Vimeo’daki video klasörü sayfasını açın.' };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIMEO_VIDEOS' });
    return { videos: response?.videos ?? [] };
  } catch {
    return { error: 'Bu Vimeo sayfası okunamadı. Sayfayı yenileyip tekrar deneyin.' };
  }
}

async function loadVideos({ refreshPinnedList = false } = {}) {
  const { [PINNED_VIDEOS_KEY]: pinnedVideos } = await chrome.storage.local.get(PINNED_VIDEOS_KEY);

  if (pinnedVideos?.length && !refreshPinnedList) {
    isPinned = true;
    displayedVideos = pinnedVideos;
    renderVideos(displayedVideos);
    updatePinButton();
    setStatus(`${displayedVideos.length} video sabitlendi. Başka sekmelere geçseniz de bu liste değişmez.`);
    return;
  }

  setStatus('Vimeo sayfası okunuyor…');
  const { videos, error } = await captureVideosFromActiveTab();
  if (error) {
    updatePinButton();
    if (isPinned && displayedVideos.length) {
      setStatus(`${error} Sabit liste korunuyor.`);
    } else {
      listElement.replaceChildren();
      setStatus(error);
    }
    return;
  }
  if (!videos.length) {
    updatePinButton();
    if (isPinned && displayedVideos.length) {
      setStatus('Video bulunamadı. Sabit liste korunuyor.');
    } else {
      isPinned = false;
      listElement.replaceChildren();
      setStatus('Video bulunamadı. Vimeo sayfası henüz yüklenmemiş olabilir.');
    }
    return;
  }

  displayedVideos = isPinned ? preserveCopyProgress(videos) : videos;
  renderVideos(displayedVideos);
  if (pinnedVideos?.length) {
    isPinned = true;
    await chrome.storage.local.set({ [PINNED_VIDEOS_KEY]: displayedVideos });
    setStatus(`${displayedVideos.length} videoluk sabit liste Vimeo’daki bilgilerle güncellendi.`);
  } else {
    isPinned = false;
    setStatus(`${displayedVideos.length} video bulundu. İsim ve linki ayrı ayrı kopyalayabilirsiniz.`);
  }
  updatePinButton();
}

pinButton.addEventListener('click', async () => {
  if (isPinned) {
    await chrome.storage.local.remove(PINNED_VIDEOS_KEY);
    isPinned = false;
    updatePinButton();
    await loadVideos({ refreshPinnedList: true });
    return;
  }

  if (!displayedVideos.length) {
    setStatus('Sabitlemek için önce Vimeo klasöründeki videoları yükleyin.');
    return;
  }

  await chrome.storage.local.set({ [PINNED_VIDEOS_KEY]: displayedVideos });
  isPinned = true;
  updatePinButton();
  setStatus(`${displayedVideos.length} video sabitlendi. Liste başka sekmelere geçince de açık kalır.`);
});

refreshButton.addEventListener('click', () => loadVideos({ refreshPinnedList: isPinned }));
loadVideos();
