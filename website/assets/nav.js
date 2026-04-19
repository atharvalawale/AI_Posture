document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('nav');
  window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>20));

  const hamburger=document.querySelector('.nav-hamburger');
  const mobileMenu=document.querySelector('.mobile-menu');
  if(hamburger&&mobileMenu){
    hamburger.addEventListener('click',()=>{
      mobileMenu.classList.toggle('open');
      document.body.style.overflow=mobileMenu.classList.contains('open')?'hidden':'';
    });
    mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      mobileMenu.classList.remove('open');
      document.body.style.overflow='';
    }));
  }

  const observer=new IntersectionObserver((entries)=>{
    entries.forEach((entry,i)=>{
      if(entry.isIntersecting)setTimeout(()=>entry.target.classList.add('visible'),i*70);
    });
  },{threshold:0.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  const path=window.location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.nav-links a,.mobile-menu a').forEach(a=>{
    if(a.getAttribute('href')===path)a.classList.add('active');
  });
});