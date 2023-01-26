async function BackendPost(endpoint, body) {
    return await fetch('http://localhost:8080/'+endpoint, {
        method:'POST', mode:'cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
}

async function KitaplariGetir() {
    return await fetch('http://localhost:8080/kitaplar', {
        method:'GET', mode:'cors'
    }).then(res=>res.json()).catch(err => console.error(err));
}

async function GirisYap(kullaniciadi, parola) {
    if(!kullaniciadi || !parola)
        return Promise.reject("Bu alanlar boş bırakılamaz!")
    // buradan yararlandım: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
    return await fetch('http://localhost:8080/auth', {
        method:'POST', mode:'cors',
        headers: {'Content-Type': 'application/json'},
        body: `{"kullaniciadi":"${kullaniciadi}","parola":"${parola}"}`
    }).then(res=>res.text());
}

function KitaplariGoster() {
    KitaplariGetir().then((v)=>{
        if(!v)
            return alertb("Kitaplar getirilemedi", "danger");
        v.forEach((e,i) => {
            let keys = Object.keys(e);
            let a = kitaplar_s.cloneNode(true);
            kitaplar_tablo.appendChild(a);
            let satirimiz = kitaplar_tablo.children[i+1];
            satirimiz.classList.remove("invisible")
            for(let i2 = 0; i2 < satirimiz.children.length; i2++) {
                satirimiz.children[i2].textContent = e[keys[i2]];
            }
        });
    })
}

// GİRİŞ
const giris_buton = document.querySelector("#giris");
const kullaniciadi_input = document.querySelector("#kullaniciadi_input");
const parola_input = document.querySelector("#parola_input");
giris_buton.addEventListener('click', async ()=>{
    let kullaniciadi = kullaniciadi_input.value;
    let parola = parola_input.value;
    if(await GirisYap(kullaniciadi, parola).catch((err)=>alertb(err.message, 'danger'))) {
        document.querySelector("#kullaniciadi_span").textContent = kullaniciadi;
        cikisyap.classList.remove("invisible")
        localStorage.setItem("kullaniciadi", kullaniciadi)
        localStorage.setItem("parola", parola)
        alertb("Başarıyla giriş yapıldı!", 'success');
    }else {
        alertb("Giriş başarısız", 'danger')
    }
})

// TAB1
// KİTAPLAR
const kitaplar_tablo = document.querySelector("#k_tablo");
const kitaplar_s = document.querySelector("#sample");
KitaplariGoster();

const kitaplar_yenile = document.querySelector("#kitaplar_yenile");
kitaplar_yenile.addEventListener('click',()=>{
    KitaplariGoster();
})

// TODO: KİTAP ARAMA
const kitap_ara = document.querySelector("#kitap_ara");
kitap_ara.addEventListener('click',()=>{
    alertb("Bu özellik şuan yok :/", "info")
})

// TAB2
// KİTAP KAYDETME
const kaydet_buton = document.querySelector("#kaydet_buton");
const kaydet_kadi = document.querySelector("#kaydet_kadi");
const kaydet_yil = document.querySelector("#kaydet_yil");
const kaydet_sayfa = document.querySelector("#kaydet_sayfa");
const kaydet_kategori = document.querySelector("#kaydet_kategori");
kaydet_buton.addEventListener('click', async ()=>{
    if(!kaydet_kadi.value || !kaydet_yil.value || isNaN(kaydet_yil.value) || !kaydet_sayfa.value || isNaN(kaydet_sayfa.value) || !kaydet_kategori.value) {
        return alertb("Bu alanlar boş bırakılamaz! Basım yılı ve sayfa sayısı alanlarına sayı girilmelidir.", "danger")
    }
    let r = await BackendPost('kitapkaydet', {
        kullaniciadi:localStorage.kullaniciadi, parola:localStorage.parola,
        ad:kaydet_kadi.value,
        basimyil:parseInt(kaydet_yil.value),
        sayfa:parseInt(kaydet_yil.value),
        kategori:kaydet_kategori.value
    });
    if(r.status === 200) {
        alertb("İşlem başarılı", 'success');
    }else {
        alertb("HATA: "+await r.text(), "danger")
    }
})