// Keep the demonstration inside the portfolio. No contact submission or external navigation.
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) return;
  event.preventDefault();
  let notice = document.getElementById('portfolio-preview-notice');
  if (!notice) {
    notice = document.createElement('p');
    notice.id = 'portfolio-preview-notice';
    notice.setAttribute('role','status');
    Object.assign(notice.style,{position:'fixed',bottom:'18px',left:'18px',right:'18px',zIndex:'99999',padding:'16px',background:'#fff',color:'#111',borderRadius:'10px',boxShadow:'0 8px 30px #0003',font:'14px sans-serif'});
    document.body.append(notice);
  }
  notice.textContent = 'Esta é uma demonstração do portfólio. Use os menus e role a página para explorar o projeto.';
}, true);
