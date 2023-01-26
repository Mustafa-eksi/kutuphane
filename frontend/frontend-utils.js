// ALERTLER
const alertPlaceholder = document.getElementById('liveAlertPlaceholder')
const alertb = (message, type) => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `   <div>${message}</div>`,
        `   <button type="button" onclick="this.parentElement.classList.add('invisible')" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`,
        '</div>'
    ].join('')

    alertPlaceholder.append(wrapper)
}

// TAB KONTROL
const tabbuttons =  [ document.querySelector("#tabbutton1"), document.querySelector("#tabbutton2"), document.querySelector("#tabbutton3"), document.querySelector("#tabbutton4")];
const tabs = [document.querySelector("#tab1"), document.querySelector("#tab2"), document.querySelector("#tab3"), document.querySelector("#tab4")]
let currenttab = 1;
tabbuttons.forEach((e,i)=>{
    e.addEventListener('click', ()=>{
        tabs[currenttab-1].classList.add("invisible")
        tabbuttons[currenttab-1].children[0].classList.remove("active")
        currenttab = i+1;
        tabs[i].className = "";
        tabbuttons[i].children[0].classList.add("active")
    })
})

// GİRİŞ KONTROL
const k_span = document.querySelector("#kullaniciadi_span");
const cikisyap = document.querySelector("#cikisyap");
if(localStorage.kullaniciadi && localStorage.parola) {
    k_span.textContent = localStorage.kullaniciadi;
    cikisyap.classList.remove("invisible")
}
cikisyap.addEventListener('click', ()=>{
    localStorage.removeItem("kullaniciadi")
    localStorage.removeItem("parola")
    k_span.textContent = "";
    cikisyap.classList.add("invisible")
    alertb("Başarıyla çıkış yapıldı!", 'success')
})