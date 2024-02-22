const darkModeToggle=document.getElementById("dark-mode-toggle");function toggleMode(){var e=document.getElementById("dark-mode-toggle");'<i class="fa-solid fa-moon"></i>'===e.innerHTML.trim()?e.innerHTML='<i class="fa-solid fa-circle-half-stroke"></i>':e.innerHTML='<i class="fa-solid fa-moon"></i>'}darkModeToggle.addEventListener("click",()=>{document.body.classList.toggle("latex-dark")}),document.getElementById("dark-mode-toggle").addEventListener("click",toggleMode);let modal=document.getElementById("myModal"),span=document.getElementsByClassName("close")[0];function showMessage(){modal.style.display="block"}span.onclick=function(){modal.style.display="none",clearInterval(myInterval)},window.onclick=function(e){e.target==modal&&(modal.style.display="none",clearInterval(myInterval))};let myInterval=setInterval(function(){showMessage()},18e5);function includeHTML(){let e,t,n,o,l;for(e=document.getElementsByTagName("*"),t=0;t<e.length;t++)if(o=(n=e[t]).getAttribute("w3-include-html"))return(l=new XMLHttpRequest).onreadystatechange=function(){4==this.readyState&&(200==this.status&&(n.innerHTML=this.responseText),404==this.status&&(n.innerHTML="Page not found."),n.removeAttribute("w3-include-html"),includeHTML())},l.open("GET",o,!0),void l.send()}function scrollToElementWithOffset(e,t){var e=document.querySelector(e);e&&(e=e.getBoundingClientRect().top+window.scrollY-t,window.scrollTo({top:e,behavior:"smooth"}))}var links=document.querySelectorAll('a[href^="#"]');links.forEach(function(e){e.addEventListener("click",function(e){e.preventDefault(),scrollToElementWithOffset(this.getAttribute("href"),50)})});let mybutton=document.getElementById("toTop"),prevScrollpos=window.scrollY;function scrollFunction(){var e=window.scrollY;prevScrollpos>e?mybutton.style.display="none":(500<document.body.scrollTop||500<document.documentElement.scrollTop)&&(mybutton.style.display="block"),prevScrollpos=e}function topFunction(){document.querySelectorAll(".toc-chapter a").forEach(e=>{e.classList.remove("active"),e.classList.remove("highlight")}),document.body.scrollTop=0,document.documentElement.scrollTop=0}window.onscroll=function(){scrollFunction()};const leftLink=document.getElementById("left-link"),rightLink=document.getElementById("right-link"),centerLink=document.getElementById("center-link");function handleLinkHover(e,t,n){t=centerLink.querySelector(t),n=centerLink.querySelector(n);"mouseenter"===e.type?(t.style.display="none",n.style.display="inline"):"mouseleave"===e.type&&(t.style.display="inline",n.style.display="none")}leftLink.addEventListener("mouseenter",e=>{handleLinkHover(e,".content-original",".content-hover-previous")}),leftLink.addEventListener("mouseleave",e=>{handleLinkHover(e,".content-original",".content-hover-previous")}),rightLink.addEventListener("mouseenter",e=>{handleLinkHover(e,".content-original",".content-hover-next")}),rightLink.addEventListener("mouseleave",e=>{handleLinkHover(e,".content-original",".content-hover-next")}),centerLink.addEventListener("mouseenter",e=>{handleLinkHover(e,".content-original",".content-hover")}),centerLink.addEventListener("mouseleave",e=>{handleLinkHover(e,".content-original",".content-hover")}),window.addEventListener("scroll",function(){var e=document.querySelectorAll('div[id^="section"]');let o=document.querySelectorAll(".toc-chapter a"),l=window.scrollY;e.forEach((e,t)=>{var n=e.offsetTop-100,e=n+e.clientHeight;l>=n&&l<e&&(o.forEach(e=>{e.classList.remove("active"),e.classList.remove("highlight")}),o[t].classList.add("active"),o[t].classList.add("highlight"))})}),includeHTML();