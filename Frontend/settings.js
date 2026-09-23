document.getElementById("backBtn").onclick=function(){

window.location.href="owner-dashboard.html";

}

document.querySelector("form").onsubmit=function(e){

e.preventDefault();

alert("Settings Saved Successfully!");

}