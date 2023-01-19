const express = require("express");
const sql = require("sqlite3").verbose();
const app = express();
const port = 8080;
const db = new sql.Database("./kutuphane.db", sql.OPEN_READWRITE, (err)=>{
    if(err) return console.error(err.message);
});

app.use(express.json());

function kitapkaydet(ad, basimyil, sayfa, kategori) {
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

function AuthenticateAsAdmin(kullaniciadi, parola) {
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

function KullaniciKayitliMi(tc) {
    return new Promise((res,rej)=>{
        db.all("select count(*) from kullanicilar where tc=?", [tc], (err, rows)=>{
            if(err) {
                rej(err);
            }else {
                res(rows[0]["count(*)"] === 1);
            }
        })
    })
}

function KitapKayitliMi(kitapid) {
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

function KitapKimde(kitapid) {
    return new Promise((res,rej)=>{
        db.all("select * from zimmetislemleri where kitapid=? and teslimdurumu='verildi'", [], (err, rows)=>{
            if(err){
                rej(err.message);
            }else {
                if(rows[0]){
                    res(rows[0]["tc"])
                }else{
                    res(null)
                }
            }
        })
    })
}

function TeslimEt(kitapid) {
    return new Promise((res,rej)=>{
        db.all("select * from zimmetislemleri where kitapid=? and teslimdurumu='verildi'", [], (err, rows)=>{
            if(err){
                rej(err.message);
            }else {
                if(rows[0]) {
                    db.run("update zimmetislemleri set teslimdurumu='teslim' where kitapid=? and teslimdurumu='verildi'", (err)=>{
                        if(err){
                            rej(err.message);
                        }else{
                            res();
                        }
                    })
                }
            }
        })
    })
}

function Zimmetle(kullaniciadi, parola, tc, kitapid, teslimtarihi, sil) {
    return new Promise((res,rej)=>{
        AuthenticateAsAdmin(kullaniciadi, parola).then((v)=>{
            if(v) {
            KitapKayitliMi(kitapid).then((v)=>{
                if(v){
                    if(sil === true) {//silme işlemini zimmet işlemine dönüştürmek için tcyi sıfır teslimtarihini null giriyorum
                        db.run("insert into zimmetislemleri (tc,kitapid,verilmetarihi,teslimtarihi,teslimdurumu) values (0,?,?,NULL,'silindi')", [kitapid, new Date(Date.now()).toLocaleString()], (err)=>{
                            if(err) {
                                rej(err);
                            }else{
                                res()
                            }
                        })
                    }else {
                        KullaniciKayitliMi(tc).then((v)=>{
                            if(v) {
                                KitapKimde(kitapid).then((v)=>{
                                    if(v) { // Kitap zaten birine verilmiş daha teslim edilmemiş
                                        rej("Kitap daha teslim edilmemiş");
                                    }else { // Kitap teslim edilmiş
                                        db.run("insert into zimmetislemleri (tc,kitapid,verilmetarihi,teslimtarihi,teslimdurumu) values (?,?,?,?,'verildi')", [tc, kitapid, new Date(Date.now()).toLocaleString(), teslimtarihi], (err)=>{
                                            if(err) {
                                                rej(err.message);
                                            }else{
                                                res();
                                            }
                                        })
                                    }
                                }).catch((err)=>{
                                    if(err) {
                                        rej(err);
                                    }
                                })
                            }else {
                                rej("Kullanıcı kayıtlı değil")
                            }
                        }).catch((err)=>{rej(err)})
                    }
                }else{
                    rej("Kitap kayıtlı değil.")
                }
            }).catch((err)=>{if(err) {rej(err)}})
                    
            }else {
                rej("Giriş bilgileri yanlış.")
            }
        }).catch((err)=>{
            if(err) {
                rej(err);
            }
        })
    })
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

app.post('/kitapkaydet', (req, res)=>{ // req.body = {kullaniciadi:"", parola:"", ad: "", basimyil: 2012, sayfa:500, kategori:"macera,gerilim"}
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.ad || !req.body.basimyil || isNaN(req.body.basimyil) || !req.body.sayfa || isNaN(req.body.sayfa) || !req.body.kategori) {
        res.status(400);
        res.send("Girilen bilgiler yanlış");
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
        res.send("Girilen bilgiler yanlış");
        return;
    }else {
        AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
            if(v){
                if(rows[0]["count(*)"] == 1) {
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
                }
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

app.post('/zimmetle', (req, res)=>{
    if(!req.body.kullaniciadi || !req.body.parola || !req.body.kitapid || isNaN(req.body.kitapid) || !req.body.tc || isNaN(req.body.tc) || !req.body.teslimtarihi) {
        res.status(400);
        res.send("Girilen bilgiler yanlış");
    }else {
        AuthenticateAsAdmin(req.body.kullaniciadi, req.body.parola).then((v)=>{
            if(v){
                Zimmetle(req.body.kullaniciadi, req.body.parola, req.body.tc, req.body.kitapid, req.body.teslimtarihi, false).then(()=>{
                    res.status(200);
                    res.send("Başarıyla kitap zimmetlendi");
                    return;
                }).catch((err)=>{if(err) {
                    res.status(500);
                    res.send(err);
                    return console.error(err);
                }})
            }else {
                res.status(400);
                res.send("Giriş bilgileri yanlış");
                return;
            }
        }).catch((err)=>{if(err) {
            res.status(500);
            res.send(err);
            return console.error(err);
        }})
    }
})

app.post("/teslimet", (req,res)=>{

})

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})