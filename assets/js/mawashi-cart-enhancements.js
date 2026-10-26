(() => {
  // Preserve the original cart API while showing amounts in Bahraini dinars.
  if (typeof window.CartFormatKWD === 'function') {
    window.CartFormatKWD = (num) => {
      const amount = Number(num);
      return `${(Number.isFinite(amount) ? amount : 0).toFixed(3)} د.ب`;
    };
  }

  const convertVisibleCurrency = () => {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.includes('ر.ع')) node.nodeValue = node.nodeValue.replace(/ر\.ع/g, 'د.ب');
    }
  };
  convertVisibleCurrency();
  const currencyObserver = new MutationObserver(convertVisibleCurrency);
  currencyObserver.observe(document.body, { childList: true, characterData: true, subtree: true });

  const addressSelector = [
    '#cust-address', '#customer-address', '#address', '#address-input',
    'input[name*="address" i]', 'textarea[name*="address" i]',
    'input[id*="address" i]', 'textarea[id*="address" i]',
    'input[placeholder*="عنوان"]', 'textarea[placeholder*="عنوان"]',
    'input[aria-label*="عنوان"]', 'textarea[aria-label*="عنوان"]'
  ].join(',');

  const attachAddressSuggestions = (input) => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || input.dataset.mbsAutocomplete === 'ready') return;
    input.dataset.mbsAutocomplete = 'ready';
    input.setAttribute('autocomplete', 'street-address');
    input.setAttribute('aria-autocomplete', 'list');
    const host = input.parentElement || input;
    host.classList.add('mbs-address-anchor');
    const list = document.createElement('div');
    list.className = 'mbs-address-suggestions';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'اقتراحات عنوان البحرين');
    list.hidden = true;
    host.append(list);
    let timer;
    let controller;

    const close = () => { list.hidden = true; list.replaceChildren(); };
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      if (controller) controller.abort();
      const query = input.value.trim();
      if (query.length < 3) { close(); return; }
      timer = window.setTimeout(async () => {
        controller = new AbortController();
        list.replaceChildren();
        const loading = document.createElement('div');
        loading.className = 'mbs-address-note';
        loading.textContent = 'جارٍ البحث عن عنوان في البحرين…';
        list.append(loading);
        list.hidden = false;
        try {
          const url = new URL('https://photon.komoot.io/api/');
          url.searchParams.set('q', `${query}, Bahrain`);
          url.searchParams.set('lat', '26.0667');
          url.searchParams.set('lon', '50.5577');
          url.searchParams.set('limit', '7');
          const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error('lookup failed');
          const data = await response.json();
          const matches = (data.features || []).filter((feature) => {
            const p = feature.properties || {};
            const code = String(p.countrycode || '').toLowerCase();
            const country = String(p.country || '').toLowerCase();
            const [lon, lat] = feature.geometry?.coordinates || [];
            return code === 'bh' || country.includes('bahrain') || country.includes('البحرين') || (lon >= 50.25 && lon <= 50.95 && lat >= 25.55 && lat <= 26.45);
          });
          list.replaceChildren();
          if (!matches.length) {
            const empty = document.createElement('div');
            empty.className = 'mbs-address-note';
            empty.textContent = 'لا توجد اقتراحات مناسبة. اكتب العنوان يدوياً.';
            list.append(empty);
          } else {
            matches.forEach((feature) => {
              const p = feature.properties || {};
              const label = [...new Set([p.name, p.street, p.housenumber, p.district, p.suburb, p.city, p.state, p.postcode].filter(Boolean).map(String))].join('، ') || p.osm_value || '';
              const option = document.createElement('button');
              option.type = 'button';
              option.className = 'mbs-address-option';
              option.setAttribute('role', 'option');
              option.textContent = label;
              option.addEventListener('mousedown', (event) => event.preventDefault());
              option.addEventListener('click', () => {
                input.value = label;
                input.dataset.latitude = feature.geometry?.coordinates?.[1] ?? '';
                input.dataset.longitude = feature.geometry?.coordinates?.[0] ?? '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                close();
              });
              list.append(option);
            });
          }
          const credit = document.createElement('div');
          credit.className = 'mbs-address-credit';
          credit.innerHTML = '<a href="https://photon.komoot.io/" target="_blank" rel="noopener noreferrer">Photon</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>';
          list.append(credit);
          list.hidden = false;
        } catch (error) {
          if (error.name !== 'AbortError') {
            list.replaceChildren();
            const failure = document.createElement('div');
            failure.className = 'mbs-address-note';
            failure.textContent = 'تعذر تحميل الاقتراحات حالياً. أكمل كتابة العنوان يدوياً.';
            list.append(failure);
            list.hidden = false;
          }
        }
      }, 650);
    });
    input.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    document.addEventListener('click', (event) => { if (!host.contains(event.target)) close(); });
  };

  const findAddressInputs = () => document.querySelectorAll(addressSelector).forEach(attachAddressSuggestions);
  findAddressInputs();
  const observer = new MutationObserver(findAddressInputs);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.querySelectorAll('.mbs-slaughter-options input').forEach((input) => {
    input.addEventListener('change', () => {
      const section = input.closest('.mbs-slaughter-options');
      if (section) section.dataset.selectedValue = input.value;
    });
  });
})();
