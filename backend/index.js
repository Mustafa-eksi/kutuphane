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
        db.all("select * from kitaplar", [], (err, rows)=>{
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

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})