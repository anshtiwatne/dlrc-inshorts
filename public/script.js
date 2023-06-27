// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";;

const firebaseConfig = {
    apiKey: "AIzaSyCO145OUsjafOByFoghuIQdY1HamdYuO0s",
    authDomain: "dlrc-daily.firebaseapp.com",
    projectId: "dlrc-daily",
    storageBucket: "dlrc-daily.appspot.com",
    messagingSenderId: "235007567187",
    appId: "1:235007567187:web:91c604b6d82632c036ada6"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function load_article(article, i) {
    const color_palette = ["251, 231, 198", "160, 231, 229", "180, 248, 200", "255, 174, 188"]
    const color = color_palette[(i) % color_palette.length]

    document.getElementById("articles").innerHTML +=
        `<div class="article" style="background-color: rgb(${color});">
            <div class="coverImage" style="background-image: linear-gradient(to top, rgba(${color}, 1), rgba(${color}, 0)), url(${article.coverImage});"></div>
            <div class="textContent">
            <div class="headline">${article.headline}</div>
            <div class="story">${article.story}</div>
            <div class="tags">${article.tags}</div>
            </div>
        </div>`
}

function unhide_articles() {
    const endScreen = document.getElementById("endScreen")
    endScreen.style.height = "10vh"
    endScreen.innerHTML = "That's all for now :("
    endScreen.style.scrollSnapAlign = "none"
    window.scrollTo(0, 0)
}

db.collection("articles").get().then((snapshot) => {
    let i = -1
    const today = new Date()
    console.log(today)

    snapshot.docs.forEach(doc => {
        let article = doc.data()
        let publishDate = article.publishDate.toDate()
        let timeDelta = (today.getTime() - publishDate.getTime()) / 1000
        // if the article is less than a day old
        if (timeDelta <= 86400) {
            i++
            load_article(article, i)
        }
    });
    setTimeout(unhide_articles, 250)
});