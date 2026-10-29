/* Native motion and disclosure controls. Static content remains usable without JS. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('[data-services-menu]').forEach(menu => {
    const summary=menu.querySelector('summary');
    let timer,hoverOpened=false;
    const close=()=>{clearTimeout(timer);menu.open=false;hoverOpened=false;};
    menu.addEventListener('pointerenter',()=>{if(fine.matches){clearTimeout(timer);hoverOpened=!menu.open;menu.open=true;}});
    summary.addEventListener('click',event=>{if(event.detail>0&&hoverOpened){event.preventDefault();hoverOpened=false;}});
    menu.addEventListener('pointerleave',()=>{if(fine.matches && !menu.contains(document.activeElement))timer=setTimeout(close,180);});
    menu.addEventListener('focusout',event=>{if(!menu.contains(event.relatedTarget))close();});
    document.addEventListener('click',event=>{if(!menu.contains(event.target))close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();close();summary.focus();}});
  });
  document.querySelectorAll('[data-tilt]').forEach(surface=>{
    const image=surface.querySelector('img');
    let frame=0, point;
    const reset=()=>{cancelAnimationFrame(frame);frame=0;['--tilt-x','--tilt-y','--tilt-rx','--tilt-ry'].forEach(key=>image.style.removeProperty(key));};
    surface.addEventListener('pointermove',event=>{
      if(reduced.matches||!fine.matches||event.pointerType==='touch')return;
      const box=surface.getBoundingClientRect();
      point={x:Math.max(-.5,Math.min(.5,(event.clientX-box.left)/box.width-.5)),y:Math.max(-.5,Math.min(.5,(event.clientY-box.top)/box.height-.5))};
      if(!frame)frame=requestAnimationFrame(()=>{
        frame=0;image.style.setProperty('--tilt-x',point.x*12+'px');image.style.setProperty('--tilt-y',(-8+point.y*12)+'px');
        image.style.setProperty('--tilt-rx',-point.y*8+'deg');image.style.setProperty('--tilt-ry',point.x*10+'deg');
      });
    },{passive:true});
    surface.addEventListener('pointerleave',reset);
    reduced.addEventListener('change',reset);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  });
  document.querySelectorAll('[data-demo-group]').forEach(group=>{
    const buttons=[...group.querySelectorAll('[data-demo-switch]')];
    const panels=buttons.map(button=>document.getElementById(button.getAttribute('aria-controls')));
    let animation;
    buttons.forEach((button,index)=>button.addEventListener('click',()=>{
      if(button.getAttribute('aria-pressed')==='true')return;
      animation?.cancel();
      buttons.forEach((item,i)=>item.setAttribute('aria-pressed',String(index===i)));
      panels.forEach((panel,i)=>{panel.hidden=i!==index;});
      if(!reduced.matches && panels[index].animate)animation=panels[index].animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
    }));
    reduced.addEventListener('change',()=>animation?.cancel());
  });
  if(typeof IntersectionObserver!=='function')return;
  document.querySelectorAll('.service-page:not(.sites-page) .service-process ol').forEach(steps=>{
    let played=false,frame=0,start=null;
    const finish=()=>{cancelAnimationFrame(frame);frame=0;steps.style.setProperty('--process-progress','1');};
    const tick=time=>{start??=time;const progress=Math.min(1,(time-start)/1000);steps.style.setProperty('--process-progress',String(1-Math.pow(1-progress,3)));if(progress<1&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(tick);else finish();};
    new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting&&!played){played=true;if(!reduced.matches){steps.style.setProperty('--process-progress','0');frame=requestAnimationFrame(tick);}}
      else if(!entries[0].isIntersecting&&played)finish();
    },{threshold:.3}).observe(steps);
    reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&played)finish();});
  });
  document.querySelectorAll('.sales-score-grid').forEach(grid=>{
    const scores=[...grid.querySelectorAll('[data-score]')];
    let frame=0,start=null,played=false;
    const paint=value=>scores.forEach(score=>{
      score.style.setProperty('--score',String(value));
      score.style.setProperty('--score-color',value<50?'#bb2634':value<90?'#976000':'#16804c');
      score.querySelector('span').textContent=String(Math.round(value));
    });
    const finish=()=>{cancelAnimationFrame(frame);frame=0;paint(100);};
    const tick=time=>{
      start??=time;
      const progress=Math.min(1,(time-start)/1700);
      paint(100*(1-Math.pow(1-progress,2)));
      if(progress<1&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(tick);else finish();
    };
    new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting&&!played){played=true;if(reduced.matches)finish();else{paint(0);frame=requestAnimationFrame(tick);}}
      else if(!entries[0].isIntersecting&&played)finish();
    },{threshold:.35}).observe(grid);
    reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&played)finish();});
  });
})();
