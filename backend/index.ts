import express = require("express");
import sql_ = require("sqlite3");
const sql = sql_.verbose();
const app = express();
const port = 8080;
const db = new sql.Database("./kutuphane.db", sql.OPEN_READWRITE, (err: any)=>{
    if(err) return console.error(err.message);
});
const debugMode = true;

const cors = require("cors")
app.use(cors())

app.use(express.json());

function kitapkaydet(ad: string, basimyil: number, sayfa: number, kategori: string) {
    return new Promise((res, rej)=>{
        db.run("insert into kitaplar (kitapadi,basimyili,sayfasayisi,kategoriler) values (?,?,?,?)", [ad, basimyil, sayfa, kategori], (err)=>{
            if(err) {
                rej(err.message)
            }else {
                res(true);
            }
        })
    });
}

function kitaplarigor() {
    return new Promise((res,rej)=>{
        db.all("select * from kitaplar where varmi is NULL", [], (err, rows)=>{
            if(err) {
                rej(err.message);
                return console.error(err.message);
            }
            res(rows)
        })
    })
}

function AuthenticateAsAdmin(kullaniciadi:string, parola:string): Promise<boolean> {
    return new Promise((res,rej)=>{
        db.all("select count(*) from adminler where kullaniciadi=? and parola=?", [kullaniciadi, parola], (err,rows)=>{
            if(err) {
                rej(err.message);
                return console.error(err.message);
            }
            res(rows[0]["count(*)"] === 1);
        })
    })
}

function KullaniciKayitliMi(tc:number) {
    return new Promise((res,rej)=>{
        db.all("select count(*) from kullanicilar where tc=?", [tc], (err, rows)=>{
            if(err) {
                rej(err.message);
            }else {
                res(rows[0]["count(*)"] === 1);
            }
        })
    })
}

function KitapKayitliMi(kitapid:number) {
    return new Promise((res,rej)=>{
        db.all("select count(*) from kitaplar where kitapid=? and varmi is NULL", [kitapid], (err, rows)=>{
            if(err) {
                rej(err);
            }else {
                res(rows[0]["count(*)"] === 1)
            }
        })
    })
}

function KitapKimde(kitapid:number) {
    return new Promise((res,rej)=>{
        db.all("select * from zimmetislemleri where kitapid=? and teslimdurumu='verildi'", [kitapid], (err, rows)=>{
            if(err){
                rej(err.message);
            }else {
                if(rows[0]){
                    res(rows[0]["tc"])
                }else{
                    res(false)
                }
            }
        })
    })
}

function KitapBilgi(kitapid:number) {
    return new Promise((res, rej)=>{
        db.all("select * from kitaplar where kitapid=?", [kitapid], (err, rows)=>{
            if(err)
                return rej(err.message);
            res(rows[0])
        })
    })
}

function TeslimEt(kitapid:number) {
    return new Promise((res:(any),rej)=>{
        db.all("select * from zimmetislemleri where kitapid=? and teslimdurumu='verildi'", [kitapid], (err, rows)=>{
            if(err){
                rej(err.message);
            }else {
                if(rows[0]) {
                    db.run("update zimmetislemleri set teslimdurumu='teslim', gercekteslimtarihi=? where kitapid=? and teslimdurumu='verildi'", [new Date(Date.now()).toLocaleString(), kitapid], (err)=>{
                        if(err){
                            rej(err.message);
                        }else{
                            res();
                        }
                    })
                }else {
                    rej("Kitap birine zimmetli değil")
                }
            }
        })
    })
}

function Zimmetle(kullaniciadi:string, parola:string, tc:number, kitapid:number, teslimtarihi:string, sil:boolean) {
    return new Promise((res:(any),rej)=>{
        AuthenticateAsAdmin(kullaniciadi, parola).then((v1)=>{
            if(!v1) return rej("Giriş bilgileri yanlış.")
            KitapKayitliMi(kitapid).then((v2)=>{
                if(!v2) return rej("Kitap kayıtlı değil.")
                if(sil === true) {//silme işlemini zimmet işlemine dönüştürmek için tcyi sıfır teslimtarihini null giriyorum
                    db.run("insert into zimmetislemleri (tc,kitapid,verilmetarihi,teslimtarihi,teslimdurumu) values (0,?,?,NULL,'silindi')", [kitapid, new Date(Date.now()).toLocaleString()], (err)=>{
                        if(err) {
                            rej(err);
                        }else{
                            res()
                        }
                    })
                }else {
                    KullaniciKayitliMi(tc).then((v3)=>{
                        if(!v3) return rej("Kullanıcı kayıtlı değil")
                        KitapKimde(kitapid).then((v4)=>{
                            if(v4) return rej("Kitap daha teslim edilmemiş");
                            db.run("insert into zimmetislemleri (tc,kitapid,verilmetarihi,teslimtarihi,teslimdurumu) values (?,?,?,?,'verildi')", [tc, kitapid, new Date(Date.now()).toLocaleString(), teslimtarihi], (err)=>{
                                if(err) {
                                    rej(err.message);
                                }else{
                                    res();
                                }
                            })
                        }).catch((err)=>{
                            if(err) {
                                rej(err);
                            }
                        })
                    }).catch((err)=>{rej(err)})
                }
            }).catch((err)=>{if(err) {rej(err)}})
        }).catch((err)=>{
            if(err) {
                rej(err);
            }
        })
    })
}

function KisiKaydet(tc:number, isimsoyisim:string, telefon:number, okul:string) {
    return new Promise((res:(any),rej)=>{
        KullaniciKayitliMi(tc).then((v)=>{
            if(v === true) {
                return rej("Kişi zaten kayıtlı");
            }
            db.run("insert into kullanicilar (tc,isimsoyisim,telefon,okul) values (?,?,?,?)", [tc, isimsoyisim, telefon, okul], (err)=>{
                if(err){
                    rej(err)
                }else {
                    res();
                }
            })
        }).catch((err)=>rej(err))
    })
}

function ResErr(res: express.Response<Record<string, any> | string>, code:number, err:string) {
    if(res.headersSent)
        return;
    if(err) {
        res.status(code);
        res.send(err);
        if(debugMode) {
            console.error(err);
        }
    }
}

function ResSuc(res: express.Response<Record<string, any> | string>, msg:string){
    if(res.headersSent)
        return;
    res.status(200);
    res.send(msg);
}

app.get('/', (req, res)=>{ // Connection test
    res.send("OK")
})

app.get('/kitaplar', (req, res)=>{ // Connection test
    kitaplarigor().then((v)=>{
        if(v) {
            res.send(v);
        }
    }).catch((err)=>{
        if(err) {
            res.status(500);
            res.send(err);
            console.error(err);
            return;
        }
    })
})

app.post('/auth', async (req, res)=>{
    if(!req.body.kullaniciadi || !req.body.parola)
        return ResErr(res, 400, "Girilen bilgiler yanlış. Kullaniciadi ve parola girilmek zorundadır.")
    ResSuc(res, await AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).catch((err)=>ResErr(res, 500, err)) ? "Başarılı" : "Başarısız");
})

app.post('/kitapkaydet', (req, res)=>{ // req.body = {kullaniciadi:"", parola:"", ad: "", basimyil: 2012, sayfa:500, kategori:"macera,gerilim"}
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.ad || !req.body.basimyil || isNaN(req.body.basimyil) || !req.body.sayfa || isNaN(req.body.sayfa) || !req.body.kategori) {
        res.status(400);
        res.send("Girilen bilgiler yanlış. Kullaniciadi, parola, ad, basimyil, sayfa, kategori girilmek zorundadır; basimyil ve sayfa birer sayı olmak zorundadır");
        return;
    }
    AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
        if(v) {
            kitapkaydet(req.body.ad, req.body.basimyil, req.body.sayfa, req.body.kategori).then((v)=>{
                if(v){
                    res.status(200);
                    res.send("Kitap kaydedildi.");
                    return;
                }
            }).catch((err)=>{
                if(err) {
                    res.status(500);
                    res.send(err);
                    return;
                }
            })
        }else {
            res.status(400);
            res.send("Giriş bilgileri yanlış");
            return;
        }
    }).catch((err)=>{
        if(err) {
            res.status(500);
            res.send(err);
            return;
        }
    })
})

app.post('/kitapsil', (req, res)=>{ // req.body = {kullaniciadi:"", parola:"", kitapid:1}
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.kitapid || isNaN(req.body.kitapid)) {
        res.status(400);
        res.send("Girilen bilgiler yanlış. Kullaniciadi, parola ve kitapid girilmek zorundadır, kitapid bir sayı olmalıdır.");
        return;
    }else {
        AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
            if(v){
                    db.run("update kitaplar set varmi='yok' where kitapid=?", [req.body.kitapid], (err2)=>{
                        if(err2) {
                            res.status(400);
                            res.send("Girilen kitapid yanlış");
                            return console.error(err2.message);
                        }else {
                            Zimmetle(req.body.kullaniciadi, req.body.parola, 0, req.body.kitapid, "", true).then(()=>{
                                res.status(200);
                                res.send("Başarıyla kitap silindi");
                                return;
                            }).catch((err)=>{if(err){
                                res.status(500);
                                res.send(err);
                                return console.error(err);
                            }});
                        }
                    })
            }else {
                res.status(400);
                res.send("Giriş bilgileri yanlış");
                return;
            }
        }).catch((err)=>{
            if(err) {
                res.status(500);
                res.send(err);
                return console.error(err);
            }
        })
    }
})

app.post('/zimmetle', async (req, res)=>{
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.kitapid || isNaN(req.body.kitapid) || !req.body.tc || isNaN(req.body.tc) || !req.body.teslimtarihi) {
        return ResErr(res, 400, "Girilen bilgiler yanlış. Kullaniciadi, parola, kitapid, tc ve teslimtarihi girilmek zorundadır; kitapid ve tc birer sayı olmalıdır.");
    }
    AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
        if(v){
            Zimmetle(req.body.kullaniciadi, req.body.parola, req.body.tc, req.body.kitapid, req.body.teslimtarihi, false).then(()=>{
                res.status(200);
                res.send("Başarıyla kitap zimmetlendi");
                return;
            }).catch((err)=>ResErr(res, 400, err))
        }else {
            return ResErr(res, 400, "Giriş bilgileri yanlış");
        }
    }).catch((err)=>ResErr(res, 500, err))
})

app.post("/teslimet", (req,res)=>{
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.kitapid || isNaN(req.body.kitapid)) {
        return ResErr(res, 400, "Girilen bilgiler yanlış. Kullaniciadi, parola ve kitapid girilmek zorundadır; kitapid bir sayı olmalıdır.");
    }
    TeslimEt(req.body.kitapid).then(()=>{
        ResSuc(res, "Başarıyla teslim alındı.")
    }).catch((err)=>ResErr(res, 400, err))
})

app.post("/kisikaydet",(req,res)=>{
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.tc || isNaN(req.body.tc) || !req.body.isimsoyisim || !req.body.telefon || isNaN(req.body.telefon) || !req.body.okul) {
        return ResErr(res, 400, "Girilen bilgiler yanlış. kullaniciadi, parola, tc, isimsoyisim, telefon, okul girilmelidir; tc ve telefon birer sayı olmalıdır.");
    }
    AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
        if(!v) {
            return ResErr(res, 400, "Giriş bilgileri yanlış");
        }
        KisiKaydet(req.body.tc, req.body.isimsoyisim, req.body.telefon, req.body.okul).then(()=>{
            ResSuc(res, "Kişi başarıyla kaydedildi")
        }).catch((err)=>ResErr(res, 500, err))
    }).catch((err)=>ResErr(res,500,err))
})

app.post("/kisisil", (req,res)=>{
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.tc || isNaN(req.body.tc)) {
        return ResErr(res, 400, "Girilen bilgiler yanlış. kullaniciadi, parola ve tc girilmek zorundadır ve tc sayı olmalıdır.");
    }
    AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
        if(!v) {
            return ResErr(res, 400, "Giriş bilgileri yanlış");
        }
        db.run("delete from kullanicilar where tc=?", [req.body.tc], (err)=>{
            if(err) {
                ResErr(res, 500, err.message)
            }else {
                ResSuc(res, "Kişi Başarıyla silindi")
            }
        })
    }).catch((err)=>ResErr(res,500,err))
})

// Bunun bir tek kullanım alanı var o da kişi kaydedilirken bir verinin yanlış girilmesi veya girilen verilerin geçerliliğini kaybetmesidir (mesela kişinin telefon numarasının değişmesi durumunda "telefon" kısmı değişebilmelidir). Bu yüzden tc değiştirilmek istendiğinde zimmetleme işlemlerinde kayıtlı eski tcleri de değiştirecek ve böylece kişinin zimmetislemleri'ndeki kayıtları bozulmayacaktır.
/*Bu endpointte req için kullaniciadi, parola ve tc zorunlu ancak yenitc, yeniisimsoyisim, yenitelefon, yeniokul alanları zorunlu değildir (bu alanlardan en az biri mutlaka mevcut olmalıdır). Zorunlu olmayan alanlardan mevcut olanları kişinin verisini değiştirecektir.
*/
const zorunsuz = ["yenitc", "yeniisimsoyisim", "yenitelefon", "yeniokul"];
app.post("/kisiduzenle", (req,res)=>{
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.tc || isNaN(req.body.tc)) {
        return ResErr(res, 400, "Girilen bilgiler yanlış. kullaniciadi, parola, tc girmek zorunludur ve tc bir sayı olmalıdır.");
    }
    AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then(async (v)=>{
        if(!v) {
            return ResErr(res, 400, "Giriş bilgileri yanlış");
        }
        let mevcutkayitlimi = await KullaniciKayitliMi(req.body.tc).catch((err)=>{ResErr(res, 500, err)});
        if(!mevcutkayitlimi) {
            return ResErr(res, 400, "Girdiğiniz kullanıcı tcsi kayıtlı değil")
        }
        let soruisaretleri: Array<any> = [];
        let aradaki="";
        zorunsuz.forEach((va)=>{
            if(req.body[va]) {
                aradaki = aradaki + (aradaki.length !== 0 ? "," : "") + va.substring(4,va.length) + "=?" // zorunsuzdan aldığımız string'in ilk 4 harfini çıkararak değiştirilecek olan sütunu elde ediyoruz.
                soruisaretleri.push(req.body[va])
            }
        })
        if(aradaki === "") {
            return ResErr(res, 400, "Kullanıcıda değiştirilecek bilgiler girilmemiş. En azından yenitc, yeniisimsoyisim, yenitelefon veya yeniokul girilmelidir. İstenilirse birkaçı veya hepsini girebilirsiniz.")
        }
        soruisaretleri.push(req.body.tc);
        db.run("update kullanicilar set "+aradaki+" where tc=?", soruisaretleri, (err)=>{
            if(err) {
                if(err.message === "SQLITE_CONSTRAINT: UNIQUE constraint failed: kullanicilar.tc")
                    return ResErr(res, 400, "Yeni tc zaten kayıtlı")
                return ResErr(res, 500, err.message)
            }else {
                if(req.body[zorunsuz[0]]) { // Tc değiştirilirken
                    db.run("update zimmetislemleri set tc=? where tc=?", [req.body[zorunsuz[0]], req.body.tc], (err)=>{
                        if(err) {
                            return ResErr(res, 500, err.message);
                        }
                    })
                }
                return ResSuc(res, "Kişi başarıyla düzenlendi")
            }
        })
    }).catch((err)=>ResErr(res,500,err))
})

const kitap_zorunsuz = ["yenikitapadi", "yenibasimyili", "yenisayfasayisi", "yenikategoriler"];
app.post('/kitapduzenle', async (req, res)=>{

    if(!req.body.kullaniciadi || !req.body.parola || !req.body.kitapid || isNaN(req.body.kitapid)) //Gerekenler verilmemişse
        return ResErr(res, 400, "Girilen bilgiler yanlış. Kullaniciadi, parola, kitapid zorunludur ve kitapid bir sayı olmalıdır.");
    
    let girisDurumu = await AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).catch(err=>ResErr(res,400,err));
    if(!girisDurumu) // Giriş başarısızsa
        return ResErr(res, 400, "Giriş bilgileri yanlış");

    let mevcutkayitlimi = await KitapKayitliMi(req.body.kitapid).catch((err)=>{ResErr(res, 500, err)});
    if(!mevcutkayitlimi) // Değiştirilmek istenen kitap kayıtlı değilse
        return ResErr(res, 400, "Kitapid kayıtlı değil");

    let soruisaretleri: Array<any> = [];
    let aradaki="";
    kitap_zorunsuz.forEach((va)=>{
        if(req.body[va]) {
            aradaki += (aradaki.length === 0 ? "" : ",") + va.substring(4,va.length) + "=?" // zorunsuzdan aldığımız string'in ilk 4 harfini çıkararak değiştirilecek olan sütunu elde ediyoruz.
            soruisaretleri.push(req.body[va])
        }
    })
    if(aradaki === "")
        return ResErr(res, 400, "Kullanıcıda değiştirilecek bilgiler girilmemiş")
    soruisaretleri.push(req.body.kitapid)
    db.run("update kitaplar set "+aradaki+" where kitapid=?", soruisaretleri, (err)=>{
        if(err) {
            ResErr(res, 500, err.message)
        }else {
            ResSuc(res, "Başarıyla kitap düzenlendi.")
        }
    });
});

app.post('/kitapbilgi', async (req,res)=>{ // Sadece kitapid gerekiyor
    if(!req.body.kitapid || isNaN(req.body.kitapid))
        return ResErr(res, 400, "Girilen bilgiler yanlış. Kitapid girilmelidir ve bir sayı olmalıdır.")
    if(!(await KitapKayitliMi(req.body.kitapid)))
        return ResErr(res, 400, "Girilen kitapid kayıtlı değil.")
    let bilgi: any = await KitapBilgi(req.body.kitapid).catch(err=>ResErr(res, 500, err)); //FIXME: düzgün bir struct ver buna
    if(bilgi) {
        let kimde = await KitapKimde(req.body.kitapid).catch(err=>ResErr(res, 500, err));
        bilgi.kimde = kimde;
        ResSuc(res, bilgi);
    }
})

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})