document.getElementById("backBtn").onclick=function(){

if(document.referrer.includes("owner-dashboard")){

window.location.href="owner-dashboard.html";

}else{

window.location.href="student-dashboard.html";

}

};