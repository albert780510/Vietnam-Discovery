function qs(sel, root=document){return root.querySelector(sel)}

export function initMegaNav(){
  // Click-toggle for touch devices + keyboard users.
  // NOTE: The Tailwind mega menu uses `pointer-events-none` + `opacity-0` for closed state.
  // On mobile (no hover), we must toggle these classes explicitly.
  const toggles = document.querySelectorAll('[data-mega-toggle]');
  const menus = document.querySelectorAll('[data-mega-menu]');

  function setClosed(menu){
    menu.classList.add('hidden');
    menu.classList.add('pointer-events-none','opacity-0','-translate-y-1');
    menu.classList.remove('pointer-events-auto','opacity-100','translate-y-0');
  }

  function setOpen(menu){
    menu.classList.remove('hidden');
    menu.classList.remove('pointer-events-none','opacity-0','-translate-y-1');
    menu.classList.add('pointer-events-auto','opacity-100','translate-y-0');
  }

  function closeAll(){
    toggles.forEach(t=>t.setAttribute('aria-expanded','false'));
    menus.forEach(m=>setClosed(m));
  }

  function openFor(toggle){
    const id = toggle.getAttribute('aria-controls');
    const menu = id ? document.getElementById(id) : null;
    if (!menu) return;
    closeAll();
    toggle.setAttribute('aria-expanded','true');
    setOpen(menu);
  }

  toggles.forEach(toggle=>{
    toggle.addEventListener('click',(e)=>{
      e.preventDefault();
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) closeAll();
      else openFor(toggle);
    });

    toggle.addEventListener('keydown',(e)=>{
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFor(toggle);
      }
    });
  });

  document.addEventListener('click',(e)=>{
    if (e.target.closest('[data-mega-root]')) return;
    closeAll();
  });

  document.addEventListener('keydown',(e)=>{
    if (e.key === 'Escape') closeAll();
  });

  // Initialize closed state.
  menus.forEach(m=>setClosed(m));
}
