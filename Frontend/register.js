const form=document.getElementById("registerForm");

form.addEventListener("submit",async(e)=>{

e.preventDefault();

const data={

name:name.value,

mobile:mobile.value,

email:email.value,

password:password.value

};

const response=await fetch("http://localhost:5000/api/student/register",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify(data)

});

const result=await response.json();

alert(result.message);

});