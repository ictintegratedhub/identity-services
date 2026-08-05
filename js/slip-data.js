"use strict";

/* ===========================================================
   SHARED DATA
=========================================================== */

const slipData = window.slipData || {};


/* ===========================================================
   HELPERS
=========================================================== */

function $(id){

    return document.getElementById(id);

}

function exists(id){

    return document.getElementById(id) !== null;

}

function setValue(id,value){

    if(!exists(id)) return;

    $(id).textContent = value ?? "";

}

function setHTML(id,value){

    if(!exists(id)) return;

    $(id).innerHTML = value ?? "";

}

function setImage(id,src,fallback="assets/default-photo.png"){

    if(!exists(id)) return;

    const img=$(id);

    img.src=src || fallback;

    img.onerror=function(){

        this.src=fallback;

    };

}


/* ===========================================================
   FORMATTERS
=========================================================== */

function formatNIN(nin){

    if(!nin) return "";

    nin=nin.toString().replace(/\D/g,"");

    if(nin.length!==11) return nin;

    return nin.replace(

        /(\d{4})(\d{3})(\d{4})/,

        "$1 $2 $3"

    );

}


function upper(value){

    if(!value) return "";

    return value.toString().toUpperCase();

}


function proper(value){

    if(!value) return "";

    return value.toString()

        .toLowerCase()

        .replace(/\b\w/g,c=>c.toUpperCase());

}


/* ===========================================================
   DATE
=========================================================== */

const MONTHS=[

"JAN","FEB","MAR","APR","MAY","JUN",

"JUL","AUG","SEP","OCT","NOV","DEC"

];

function issueDate(){

    const d=new Date();

    return (

        String(d.getDate()).padStart(2,"0")

        +" "+

        MONTHS[d.getMonth()]

        +" "+

        d.getFullYear()

    );

}


/* ===========================================================
   PHOTO
=========================================================== */

function loadPhoto(){

    setImage(

        "photo",

        slipData.photo

    );

}


/* ===========================================================
   QR
=========================================================== */

function loadQR(){

    if(!exists("qr")) return;

    if(slipData.qr){

        setImage(

            "qr",

            slipData.qr,

            ""

        );

        return;

    }

    if(!slipData.nin){

        $("qr").style.display="none";

        return;

    }

    const url=

        "https://api.qrserver.com/v1/create-qr-code/"

        +"?size=180x180"

        +"&data="

        +encodeURIComponent(

            slipData.nin

        );

    $("qr").src=url;

}


/* ===========================================================
   COMMON FIELDS
=========================================================== */

function populateCommon(){

    setValue(

        "surname",

        upper(slipData.surname)

    );

    setValue(

        "firstName",

        upper(slipData.firstName)

    );

    setValue(

        "middleName",

        upper(slipData.middleName)

    );

    setValue(

        "gender",

        upper(slipData.gender)

    );

    setValue(

        "dob",

        upper(

            slipData.dateOfBirth

        )

    );

    setValue(

        "nin",

        formatNIN(

            slipData.nin

        )

    );

    setValue(

        "issueDate",

        issueDate()

    );

    loadPhoto();

    loadQR();

}

/* ===========================================================
   BASIC SLIP
=========================================================== */

function populateBasic(){

    setValue(

        "trackingId",

        slipData.trackingId

    );

    setValue(

        "address",

        proper(slipData.address)

    );

}


/* ===========================================================
   PREMIUM SLIP
=========================================================== */

function populatePremium(){

    setValue(

        "country",

        slipData.country || "NGA"

    );

}


/* ===========================================================
   IMPROVED SLIP
=========================================================== */

function populateImproved(){

    setValue(

        "country",

        slipData.country || "NGA"

    );

}


/* ===========================================================
   AUTO DETECT TEMPLATE
=========================================================== */

function detectTemplate(){

    if(exists("trackingId")){

        return "basic";

    }

    if(exists("issueDate") && exists("qr")){

        if(

            document.querySelector(

                ".improved-card"

            )

        ){

            return "improved";

        }

        return "premium";

    }

    return "unknown";

}


/* ===========================================================
   RENDER
=========================================================== */

function renderSlip(){

    populateCommon();

    switch(detectTemplate()){

        case "basic":

            populateBasic();

            break;

        case "premium":

            populatePremium();

            break;

        case "improved":

            populateImproved();

            break;

        default:

            console.warn(

                "Unknown slip template."

            );

    }

}


/* ===========================================================
   UPDATE DATA
=========================================================== */

function updateSlip(data={}){

    Object.assign(

        slipData,

        data

    );

    renderSlip();

}


/* ===========================================================
   READY
=========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        renderSlip();

    }

);


/* ===========================================================
   PUBLIC API
=========================================================== */

window.renderSlip = renderSlip;

window.updateSlip = updateSlip;

window.slipData = slipData;

/* ===========================================================
   PRINT
=========================================================== */

function printSlip(){

    window.print();

}


/* ===========================================================
   PDF EXPORT
=========================================================== */

function exportPDF(fileName){

    if(typeof html2pdf === "undefined"){

        printSlip();

        return;

    }

    const page = document.querySelector(".page");

    const defaultName = detectTemplate().charAt(0).toUpperCase()
        + detectTemplate().slice(1)
        + "_NIN_Slip";

    html2pdf()

        .set({

            margin:0,

            filename:

                fileName ||

                `${defaultName}_${(slipData.nin || "NIN").replace(/\D/g,"")}.pdf`,

            image:{

                type:"jpeg",

                quality:1

            },

            html2canvas:{

                scale:4,

                useCORS:true,

                allowTaint:true,

                backgroundColor:"#ffffff",

                logging:false,

                scrollX:0,

                scrollY:0

            },

            jsPDF:{

                unit:"mm",

                format:"a4",

                orientation:"portrait"

            },

            pagebreak:{

                mode:["avoid-all"]

            }

        })

        .from(page)

        .save();

}


/* ===========================================================
   IMAGE PRELOAD
=========================================================== */

function preloadImages(){

    const images=[

        "assets/default-photo.png",

        "assets/basic-slip.png",

        "assets/premium-front.png",

        "assets/premium-back.png",

        "assets/improved-front.png",

        "assets/improved-back.png"

    ];

    images.forEach(src=>{

        const img=new Image();

        img.src=src;

    });

}


/* ===========================================================
   WAIT FOR IMAGES
=========================================================== */

window.addEventListener("load",()=>{

    Promise.all(

        [...document.images].map(img=>{

            if(img.complete){

                return Promise.resolve();

            }

            return new Promise(resolve=>{

                img.onload=resolve;

                img.onerror=resolve;

            });

        })

    ).then(()=>{

        document.body.classList.remove("loading");

        document.body.classList.add("ready");

        console.log("Slip Ready");

    });

});

/* ============================================================
   QR CODE GENERATION
============================================================ */

function generateQRData(data) {
    return JSON.stringify({
        nin: data.nin || '',
        fullName: data.fullName || `${data.firstName || ''} ${data.surname || ''}`.trim(),
        dob: data.dateOfBirth || '',
        gender: data.gender || ''
    });
}

function renderQR(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded');
        return;
    }
    
    element.innerHTML = '';
    
    try {
        new QRCode(element, {
            text: generateQRData(data),
            width: 120,
            height: 120,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (e) {
        console.error('QR generation error:', e);
    }
}

/* ===========================================================
   PUBLIC API
=========================================================== */

window.printSlip = printSlip;

window.exportPDF = exportPDF;

window.preloadSlipImages = preloadImages;


/* ===========================================================
   STARTUP
=========================================================== */

preloadImages();

renderSlip();