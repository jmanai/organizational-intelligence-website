(function () {
  var copy = document.querySelector('[data-copy-link]');
  var share = document.querySelector('[data-share]');
  var status = document.querySelector('[data-share-status]');
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      status.textContent = 'Article link copied.';
      copy.textContent = 'Link copied';
      setTimeout(function () {copy.textContent = 'Copy link';}, 2500);
    } catch (_) { status.classList.remove('vh'); status.textContent = 'Copy the article address from your browser’s address bar.'; }
  }
  if (copy) copy.addEventListener('click', copyLink);
  if (share) {
    document.addEventListener('click', function (event) {
      if (!share.contains(event.target)) share.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && share.open) {
        share.open = false;
        share.querySelector('summary').focus();
      }
    });
    share.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {share.open = false;});
    });
  }
  var links = document.querySelectorAll('.article-toc a');
  if ('IntersectionObserver' in window && links.length) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {if (!entry.isIntersecting) return;
        links.forEach(function(link) {if(link.hash === '#' + entry.target.id) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');});
      });
    }, {rootMargin:'-15% 0px -65% 0px'});
    links.forEach(function(link) {var heading=document.getElementById(link.hash.slice(1)); if(heading) observer.observe(heading);});
  }
})();
