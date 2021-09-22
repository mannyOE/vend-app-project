const functions = require('firebase-functions');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { get } = require('http');
const moment = require('moment');
// const google = require('googleapis');
// const uuidv4 = require("uuid")
// import { v4 as uuidv4 } from 'uuid';

admin.initializeApp();

const runtimeOpts = {
  timeoutSeconds: 90,
  memory: '512MB',
};

const bearRuntimeOpts = {
  timeoutSeconds: 90,
};

// exports.tcv = functions.https.onRequest((request, response) => {
exports.tcv = functions
  .runWith(runtimeOpts)
  .firestore.document('/links/{slug}/metatags/{id}')
  .onUpdate(async (change, context) => {
    // Exit when the data is deleted.
    if (!change.after.exists) {
      return null;
    }

    await (async () => {
      let redirected = false;

      // await functions.logger.log("Username: ", snap.data());
      // console.log("data: ", snap);
      const bucket = await admin.storage().bucket();

      const username = '@opsonite';
      // await functions.logger.log("Username: ", username);
      console.log('Username: ', username);

      const email = 'enquiry@prodeus.ng';
      console.log('Email for challenge: ', email);

      const password = 'Transactional144___';
      // await functions.logger.log("Password: ", password);
      console.log(context.slug);
      // let tag = ""
      // switch (context.slug) {
      //   case "Money":
      //     tag = "vend.money";
      //     break;
      //   case "Join":
      //     day = "Monday";
      //     break;

      const url_to_evaluate = change.after.data().link;
      // const url_to_evaluate = `http://vend.money/${change.after.id}`;
      // await functions.logger.log("Url to evaluate: ", url_to_evaluate);
      console.log('Url to evaluate: ', url_to_evaluate);
      const db = await admin.firestore();

      //HANDLE BROWSER
      // await functions.logger.log("start open browser");
      console.log('start open browser');
      const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
      });
      console.log('start open browser');
      // await functions.logger.log("start open page");
      page = await browser.newPage();

      //TWITTER SET COOKIES
      console.log('TWITTER SET COOKIES');
      let savedCookies = [];
      const docRef = db.collection('twitterCookies').doc('loginCookies');
      console.log('cookies was getted');
      const getDoc = docRef
        .get()
        .then((doc) => {
          if (!doc.exists) {
            functions.logger.error('No such document!');
          }
          functions.logger.log('Retrieved document: ', doc.data());
          savedCookies = doc.data().cookies;
          functions.logger.log('Saved Cookies array: ', savedCookies);
        })
        .catch((err) => {
          functions.logger.error('Error getting document', err);
        });

      await page.waitForTimeout(2000);
      try {
        await page.setCookie(...savedCookies);
        await functions.logger.log('Cookies succesfully setted!');
      } catch (e) {
        await functions.logger.error('Error setting cookies: ', e);
      }

      //TWITTER TEST LOGIN
      await functions.logger.info('Testing saved login section.');
      await page.on('response', (response) => {
        const status = response.status();
        if (status >= 300 && status <= 399) {
          redirected = true;
        }
      });
      await page.goto('https://cards-dev.twitter.com/validator');
      await page.waitForTimeout(5000);

      if (redirected) {
        await functions.logger.error(
          'Section has expired. Attempting to login again.',
        );

        //TWITTER LOGIN
        await functions.logger.log('Logging to Twitter.');

        /** Define twitter fields */
        let twitterAccount = {
          userField: "input[name='session[username_or_email]']",
          passField: "input[name='session[password]']",
          loginSubmit:
            '#react-root > div > div > div.css-1dbjc4n.r-13qz1uu.r-417010 > main > div > div > div.css-1dbjc4n.r-13qz1uu > form > div > div:nth-child(8) > div',
          challenge: '#challenge_response',
          challengeSubmit: '#email_challenge_submit',
        };

        await page.goto('https://twitter.com/login');
        await page.waitForTimeout(5000);

        /** Enter twitter id */
        await functions.logger.log('Typing username.');
        await page.waitForSelector(twitterAccount.userField);
        await page.click(twitterAccount.userField);
        await page.keyboard.type(username);

        /** Enter twiiter password */
        await functions.logger.log('Typing password.');
        await page.waitForSelector(twitterAccount.passField);
        await page.click(twitterAccount.passField);
        await page.keyboard.type(password);
        await page.waitForTimeout(2000);

        /** Click Button  */
        await functions.logger.log('Clicking submit button.');
        await page.waitForSelector(twitterAccount.loginSubmit);
        await page.click(twitterAccount.loginSubmit);
        await page.waitForTimeout(5000);

        await functions.logger.info('Checking for challenge page.');
        let challenge = await page.$$(twitterAccount.challenge);

        if (challenge.length > 0) {
          await functions.logger.info(
            'Challenge page found, passing challenge.',
          );
          await page.click(twitterAccount.challenge);
          await page.keyboard.type(email);
          await page.click(twitterAccount.challengeSubmit);
          await page.waitForTimeout(5000);
        } else {
          await functions.logger.info('No challenge found, continuing.');
        }

        // await functions.logger.info("Taking screenshot of logged home page.");
        // let imageBuffer = await page.screenshot();
        // let file = bucket.file(`twitter-login-${Date.now()}.png`);
        // await file.save(imageBuffer);

        //save cookies
        const cookies = await page.cookies();
        const twitterCookies = {
          cookies: cookies,
        };

        await functions.logger.log('Cookies object created: ', twitterCookies);

        await db
          .collection('twitterCookies')
          .doc('loginCookies')
          .set(twitterCookies);
      } else {
        await functions.logger.info('Saved login section is still valid!');
      }

      //TWITTER CARD
      await functions.logger.info('Validating Twitter Card.');
      let cardParams = {
        input: '.FormControl',
        submit:
          '#ValidationForm > div > div.Grid-cell.u-sizeFill.u-marginTm > input',
      };

      await page.goto('https://cards-dev.twitter.com/validator');
      await page.setViewport({ width: 1280, height: 800 });
      await page.waitForTimeout(5000);

      //Saving screenshot of valid cards page loaded
      // await functions.logger.info("Saving cards page screenshot.");
      // imageBuffer = await page.screenshot();
      // file = bucket.file(`twitter-card-${Date.now()}.png`);
      // await file.save(imageBuffer);

      await page.waitForSelector(cardParams.input);
      await functions.logger.log('Input selector found!');
      await page.click(cardParams.input);

      await functions.logger.log('Typing url to evaluate');
      await page.keyboard.type(url_to_evaluate);

      await functions.logger.log('Waiting for submit button');
      await page.waitForSelector(cardParams.submit);
      await page.click(cardParams.submit);

      await functions.logger.log('Submit button clicked');
      await page.waitForTimeout(5000);

      //Saving screenshot of final cards page
      // await functions.logger.info("Saving final cards page screenshot.");
      // imageBuffer = await page.screenshot();
      // file = bucket.file(`twitter-card-final-${Date.now()}.png`);
      // await file.save(imageBuffer);

      await functions.logger.log('Closing browser');
      await browser.close();
      // await response.json({ success: true });
      // console.log("start updating facebook preview");
      // const facebookUpdate = async () => {
      //   const response = await fetch(
      //     `https://graph.facebook.com/?id={${url_to_evaluate}}&scrape=true`,
      //     {
      //       method: "POST",
      //       access_token:
      //         "EAAFcvibnHPMBAKcrL9zSMZBO9eWppWGt3pXIZAmUE48iSMyOrjhuU8CCNSew9xZAv2TZBE3eYIuLl42ZAlk43nZCYkfryAkZCFAgA0mC5T3sT2pNnGawSZBIiHQy24Mc33ZAZB6PvkHBS20umOqoZBELc42D2cyWA4FYT2EgHpMbaMONr5DlIMC9PvCE5hBT80JkRiEC7iH7QUlI1UnGPAEe2VT2FAKL7i99XmV2Vt8syQK6gZDZD",
      //       headers: {
      //         "Content-Type": "application/json",
      //       },
      //     }
      //   );
      //   const updatedObj = await response.json();
      //   console.log(updatedObj);
      //   console.log("facebook preview updated");
      // };
      // await facebookUpdate();
    })();
    // return snap.data();
  });

exports.bear = functions
  .runWith(bearRuntimeOpts)
  .firestore.document('/links/Join/metatags/{id}')
  .onCreate(async (snap, context) => {
    console.log('start bear');
    function numberWithCommas(x) {
      return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
    }
    let amount = numberWithCommas(snap.data().amount);

    const response = await fetch('https://api.bannerbear.com/v2/images', {
      method: 'POST',
      body: JSON.stringify({
        template: 'PowdyxbdBj85lYBAgQ',
        modifications: [
          {
            name: 'Handle',
            text: `I just received a N50,000 gift from *${
              snap.data().author.handle
            }*`,
            color: null,
            background: null,
          },
          {
            name: 'Main Text',
            text: `I just received a N${amount} gift from`,
            color: null,
            background: null,
          },
        ],
        webhook_url: null,
        transparent: false,
        metadata: null,
      }),
      headers: {
        Authorization: 'Bearer 6DZEaWTzvevtuvKxwZVUpwtt',
        'Content-Type': 'application/json',
      },
    });
    const bearImg = await response.json();
    const imgSelf = await bearImg.self;
    console.log('bear image created');
    await setTimeout(async () => {
      const imgURL = await fetch(imgSelf, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer 6DZEaWTzvevtuvKxwZVUpwtt',
        },
      });
      const img = await imgURL.json();
      const pho = await img.image_url;
      await functions.logger.info(pho);
      await admin
        .firestore()
        .collection('/links/Join/metatags')
        .doc(snap.id)
        .update({
          pho: pho,
        });
    }, 3000);
  });

exports.res = functions.firestore
  .document('/vends/{slug}/sessions/{id}/subVend/{sub}/actions/resolve')
  .onWrite(async (change, context) => {
    if (
      !change.after.exists ||
      change.after.data().acctNo === '' ||
      change.after.data().acctNo === '' ||
      !change.after.data().open ||
      change.after.data().attempts > 9 ||
      !change.after.data().acctNo ||
      !change.after.data().bankCode
    ) {
      if (
        change.after.exists &&
        change.after.data().attempts &&
        change.after.data().attempts > 9
      ) {
        const subVendDocData = await admin
          .firestore()
          .collection(
            `/vends/${context.params.slug}/sessions/${context.params.id}/subVend`,
          )
          .doc(context.params.sub)
          .get();
        await admin
          .firestore()
          .collection(
            `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/states`,
          )
          .doc(`onError`)
          .set(
            {
              message: 'system abuse',
              createdAt: new Date(),
              claimantID: subVendDocData.data().claimant.uid,
              subVend: context.params.sub,
            },
            { merge: true },
          );

        await admin
          .firestore()
          .collection(
            `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/actions`,
          )
          .doc('resolve')
          .update({
            open: false,
          });
      } else if (
        change.after.exists &&
        change.after.data().attempts &&
        change.after.data().attempts <= 9
      ) {
        await admin
          .firestore()
          .collection(
            `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/actions`,
          )
          .doc('resolve')
          .update({
            open: true,
          });
      }
      return null;
    }

    const actNum = change.after.data().acctNo,
      bankCode = change.after.data().bankCode;

    console.log(actNum, bankCode);
    console.log('start resolve');
    const fetchData = async (actNum, bankCode) => {
      const data = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${actNum}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            Authorization:
              'Bearer sk_test_64c5be8f7e134b8ac246dec64b212466ab757dcf',
          },
        },
      );
      const userData = await data.json();
      await functions.logger.info(userData);
      return userData;
    };

    const userData = await fetchData(actNum, bankCode);

    if (userData.status) {
      await admin
        .firestore()
        .collection(
          `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/actions`,
        )
        .doc('resolve')
        .update({
          acctName: userData.data.account_name,
          bankCode: '',
          acctNo: '',
          vendlyRef: `${actNum}_${bankCode}`,
          attempts: change.after.data().attempts + 1,
          success: true,
          errorMessage: '',
        });
    } else {
      await admin
        .firestore()
        .collection(
          `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/actions`,
        )
        .doc('resolve')
        .update({
          vendlyRef: '',
          acctName: '',
          success: false,
          bankCode: '',
          acctNo: '',
          remember: false,
          attempts: change.after.data().attempts + 1,
          errorMessage: 'Account not found”',
        });
    }
  });

exports.scheduler = functions.firestore
<<<<<<< HEAD
  .document("/vends/{slug}/sessions/{id}/subVend/{sub}/actions/reward")
  .onWrite(async (change, context) => {
    try {
        if (!change.after.exists) {
            return null;
          }
          console.log("function started");
      
          let claimantID = context.params.id
          let vendID = context.params.slug
          let uidSha = crypto.createHash('sha256').update(claimantID + vendID, 'utf8').digest('hex');
            let backendRTDRef = admin.database().ref(`/vends/${vendID}/knocks/attempts/${uidSha}/subvend/`)
      
          const subVend = change.after.data().subVend,
              acctVerify = change.after.data().acctVerify,
            domain = change.after.data().domain,
            isDisputed = change.after.data().isUserDisputed;
      
          const subVendRef = admin
            .firestore()
            .collection(
              `/vends/${context.params.slug}/sessions/${context.params.id}/subVend`
            )
            .doc(subVend);
          console.log("get subVendRef");
      
          const subVendData = await subVendRef.get();
          let vendlyRef = subVendData.data().to.vendlyRef;
      
          console.log(vendlyRef, subVend);
          const transmission = subVendData.data().to.transmission;
      
          const fetchData = async (actNum, bankCode) => {
            const data = await fetch(
              `https://api.paystack.co/bank/resolve?account_number=${actNum}&bank_code=${bankCode}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${
                    functions.config().paystack_test.secret_key
                  }`,
                },
              }
            );
            const userName = await data.json();
            await functions.logger.info(userName);
            console.log(userName.data.account_name, actNum, bankCode);
      
            if (userName.status) {
              const data = await fetch(`https://api.paystack.co/transferrecipient`, {
                method: "POST",
                body: JSON.stringify({
                  type: "nuban",
                  name: userName.data.account_name,
                  description: "Zombier",
                  account_number: actNum,
                  bank_code: bankCode,
                  currency: "NGN",
                }),
                headers: {
                  Authorization: `Bearer ${
                    // functions.config().flutterwave.secret_key
                    functions.config().paystack_test.secret_key
                  }`,
                  "Content-Type": "application/json",
                },
              });
              const userData = await data.json();
              await functions.logger.info(userData);
              if (userData.status) {
                return userData;
=======
  .document('/vends/{slug}/sessions/{id}/subVend/{sub}/actions/reward')
  .onUpdate(async (change, context) => {
    if (!change.after.exists) {
      return null;
    }
    console.log('function started');

    let claimantID = context.params.id;
    let vendID = context.params.slug;
    let uidSha = crypto
      .createHash('sha256')
      .update(claimantID + vendID, 'utf8')
      .digest('hex');
    let backendRTDRef = admin
      .database()
      .ref(`/vends/${vendID}/knocks/attempts/${uidSha}/subvend/`);
    let backendData = await (await backendRTDRef.once('value')).val();
    let subvendLogs = admin
      .firestore()
      .collection(
        `/vends/${context.params.slug}/sessions/${context.params.id}/subVend`,
      )
      .doc(`${context.params.sub}`)
      .collection('logs');

    if (
      (!backendData && !backendData.backend && backendData.backend.boolean) ||
      moment().diff(new Date(backendData.backend.time), 'minutes') <= 1
    ) {
      // log and stop
      let log = {
        uid: context.params.id,
        status: 303,
        critical: true,
        createdAt: new Date(),
        message: 'Task currently running. Try later',
      };
      await subvendLogs.doc(new Date().getTime()).set(log);
      return null;
    } else {
      await backendRTDRef
        .child('backend')
        .child('time')
        .set(new Date().getTime());
      await backendRTDRef.child('backend').child('boolean').set(true);
    }

    const subVend = change.after.data().subVend,
      acctVerify = change.after.data().acctVerify,
      domain = change.after.data().domain,
      isDisputed = change.after.data().isUserDisputed;

    const subVendRef = admin
      .firestore()
      .collection(
        `/vends/${context.params.slug}/sessions/${context.params.id}/subVend`,
      )
      .doc(subVend);
    console.log('get subVendRef');

    const subVendData = await subVendRef.get();
    let vendlyRef = subVendData.data().to.vendlyRef;

    console.log(vendlyRef, subVend);
    const transmission = subVendData.data().to.transmission;

    const fetchData = async (actNum, bankCode) => {
      const data = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${actNum}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${
              functions.config().paystack_test.secret_key
            }`,
          },
        },
      );
      const userName = await data.json();
      await functions.logger.info(userName);
      console.log(userName.data.account_name, actNum, bankCode);

      if (userName.status) {
        const data = await fetch(`https://api.paystack.co/transferrecipient`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'nuban',
            name: userName.data.account_name,
            description: 'Zombier',
            account_number: actNum,
            bank_code: bankCode,
            currency: 'NGN',
          }),
          headers: {
            Authorization: `Bearer ${
              // functions.config().flutterwave.secret_key
              functions.config().paystack_test.secret_key
            }`,
            'Content-Type': 'application/json',
          },
        });
        const userData = await data.json();
        await functions.logger.info(userData);
        if (userData.status) {
          return userData;
        } else {
          return null;
        }
      } else {
        return null;
      }
    };

    let dateNow = Date.now();
    const logRef = admin
      .firestore()
      .collection(
        `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`,
      )
      .doc(`${dateNow}_scheduled`);
    // ************************************************************

    // const bancAcctRef = admin
    //   .firestore()
    //   .collection(`/bankAccts`)
    //   .doc(vendlyRef);

    // let [actNum, bankCode] = vendlyRef.split("_");
    // let recipent = await fetchData(actNum, bankCode);
    // console.log(recipent);
    // let dateNow = Date.now();
    // const logRef = admin
    //   .firestore()
    //   .collection(
    //     `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
    //   )
    //   .doc(`${dateNow}_scheduled`);
    // if (recipent != null) {
    //   console.log("account name: ", recipent.data.name);
    //   console.log("recipent: ", recipent.data.recipient_code);

    // ******************************************
    if (transmission === 'bank') {
      const bancAcctRef = admin
        .firestore()
        .collection(`/bankAccts`)
        .doc(vendlyRef);

      let [actNum, bankCode] = vendlyRef.split('_');
      let recipent = await fetchData(actNum, bankCode);
      console.log(recipent);
      // let dateNow = Date.now();
      // const logRef = admin
      //   .firestore()
      //   .collection(
      //     `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
      //   )
      //   .doc(`${dateNow}_scheduled`);
      if (recipent != null) {
        console.log('account name: ', recipent.data.name);
        console.log('recipent: ', recipent.data.recipient_code);

        await bancAcctRef.set({
          createdAt: new Date(),
          Nuban: actNum,
          bankCode,
          acctName: recipent.data.name,
          isFlagged: false,
          reference: {
            paystack: recipent.data.recipient_code,
            flutterwave: null,
          },
        });
        console.log('write to global bank accounts');
        // }

        console.log(
          `slug: ${context.params.slug}, id: ${context.params.id}, subVend: ${subVend}`,
        );

        console.log(
          `recipientCode: ${recipent.data.recipient_code}, bankName: ${recipent.data.details.bank_name}`,
        );
        await subVendRef.update(
          {
            'to.recipientCode': recipent.data.recipient_code,
            'to.bankName': recipent.data.details.bank_name,
            'to.acctName': recipent.data.name,
          },
          { merge: true },
        );
        console.log('write to subVend');

        let remember = subVendData.data().to.remember,
          primary = subVendData.data().to.isPrimary;
        let vin = subVendData.data().claimant.uid;
        console.log(`remeber: ${remember}, primary: ${primary}, vin: ${vin}`);
        const RTDref = admin.database().ref(`users/${vin}/myBankAccts`);

        if (remember) {
          await admin
            .database()
            .ref(`users/${vin}/myBankAccts/${vendlyRef}`)
            .set({
              acctNo: actNum,
              bankCode: bankCode,
              acctName: subVendData.data().to.acctName,
              bankName: recipent.data.details.bank_name,
              isPrimary: primary,
            });
          console.log('write to RTD');
          // **********************
        }

        if (remember && primary) {
          // ***************************************
          await RTDref.once('value', async (snapshot) => {
            console.log(snapshot.val());
            for (const childKey in snapshot.val()) {
              console.log(childKey);
              if (childKey === vendlyRef) {
                await admin
                  .database()
                  .ref(`users/${vin}/myBankAccts/${childKey}`)
                  .update({
                    isPrimary: true,
                  });
>>>>>>> 48a3cb395f95a6b764b99eed176bf515c1598511
              } else {
                return null;
              }
            } else {
              return null;
            }
          };
      
          let dateNow = Date.now();
          const logRef = admin
            .firestore()
            .collection(
              `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
            )
            .doc(`${dateNow}_scheduled`);
          // ************************************************************
      
          // const bancAcctRef = admin
          //   .firestore()
          //   .collection(`/bankAccts`)
          //   .doc(vendlyRef);
      
          // let [actNum, bankCode] = vendlyRef.split("_");
          // let recipent = await fetchData(actNum, bankCode);
          // console.log(recipent);
          // let dateNow = Date.now();
          // const logRef = admin
          //   .firestore()
          //   .collection(
          //     `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
          //   )
          //   .doc(`${dateNow}_scheduled`);
          // if (recipent != null) {
          //   console.log("account name: ", recipent.data.name);
          //   console.log("recipent: ", recipent.data.recipient_code);
      
          // ******************************************
          if (transmission === "bank") {
            const bancAcctRef = admin
              .firestore()
              .collection(`/bankAccts`)
              .doc(vendlyRef);
      
            let [actNum, bankCode] = vendlyRef.split("_");
            let recipent = await fetchData(actNum, bankCode);
            console.log(recipent);
            // let dateNow = Date.now();
            // const logRef = admin
            //   .firestore()
            //   .collection(
            //     `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
            //   )
            //   .doc(`${dateNow}_scheduled`);
            if (recipent != null) {
              console.log("account name: ", recipent.data.name);
              console.log("recipent: ", recipent.data.recipient_code);
      
              await bancAcctRef.set({
                createdAt: new Date(),
                Nuban: actNum,
                bankCode,
                acctName: recipent.data.name,
                isFlagged: false,
                reference: {
                  paystack: recipent.data.recipient_code,
                  flutterwave: null,
                },
              });
              console.log("write to global bank accounts");
              // }
      
              console.log(
                `slug: ${context.params.slug}, id: ${context.params.id}, subVend: ${subVend}`
              );
      
              console.log(
                `recipientCode: ${recipent.data.recipient_code}, bankName: ${recipent.data.details.bank_name}`
              );
              await subVendRef.update(
                {
                  "to.recipientCode": recipent.data.recipient_code,
                  "to.bankName": recipent.data.details.bank_name,
                  "to.acctName": recipent.data.name,
                },
                { merge: true }
              );
              console.log("write to subVend");
      
              let remember = subVendData.data().to.remember,
                primary = subVendData.data().to.isPrimary;
              let vin = subVendData.data().claimant.uid;
              console.log(`remeber: ${remember}, primary: ${primary}, vin: ${vin}`);
              const RTDref = admin.database().ref(`users/${vin}/myBankAccts`);
      
              if (remember) {
                await admin
                  .database()
                  .ref(`users/${vin}/myBankAccts/${vendlyRef}`)
                  .set({
                    acctNo: actNum,
                      bankCode: bankCode,
                      acctName: resolveData.acctName,
                    bankName: recipent.data.details.bank_name,
                    isPrimary: primary,
                  });
                console.log("write to RTD");
                // **********************
              }
<<<<<<< HEAD
      
              if (remember && primary) {
                // ***************************************
                await RTDref.once("value", async (snapshot) => {
                  console.log(snapshot.val());
                  for (const childKey in snapshot.val()) {
                    console.log(childKey);
                    if (childKey === vendlyRef) {
                      await admin
                        .database()
                        .ref(`users/${vin}/myBankAccts/${childKey}`)
                        .update({
                          isPrimary: true,
                        });
                    } else {
                      await admin
                        .database()
                        .ref(`users/${vin}/myBankAccts/${childKey}`)
                        .update({
                          isPrimary: false,
                        });
                    }
                  }
                });
                // **************************************
              }
              if (!acctVerify && !isDisputed) {
                const payoutRef = admin
                  .firestore()
                  .collection(`/transactions/payouts/records`);
                // .doc(subVendData.data().vend);
                console.log("get payoutRef");
      
                let paystack = "paystack",
                  live = true;
                if (domain === "test") {
                  paysrack = "paystack_test";
                  live = false;
                } else if (domain === "live") {
                  paysrack = "paystack_live";
                  live = true;
                }
      
                await payoutRef.add({
                  paystack: recipent.data.recipient_code,
                  live,
                  createdAt: new Date(),
                  subVend,
                  vend: subVendData.data().vend,
                  amount: subVendData.data().to.amt,
                  transmission: subVendData.data().to.transmission,
                  claimantId: vin,
                  sessionId: context.params.id,
                });
                console.log(`set the payOut`);
                if (acctVerify || isDisputed) {
                    await logRef.set({
                        createdAt: new Date(),
                        status: "pending",
                        type: "scheduled",
                        message: "",
                      });
                  } else {
                      await logRef.set({
                          createdAt: new Date(),
                          status: "scheduled",
                          type: "scheduled",
                          message: "",
                      });
                  }
                  await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                  await backendRTDRef.child("backend").child("boolean").set(false)
                  return;
              }
      
              if (acctVerify) {
                const notificationsRef = admin
                  .firestore()
                  .collection(`/users/${subVendData.data().author}/notifications`);
      
                await notificationsRef.add({
                  type: "acct-verify",
                  details: {
                    vendlyRef,
                    subVend,
                    acctName: recipent.data.name,
                    acctNumber: actNum,
                    bankCode: bankCode,
                  },
                });
                await logRef.set({
                  createdAt: new Date(),
                  pending: acctVerify,
                  type: "scheduled"
                });
                await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                  await backendRTDRef.child("backend").child("boolean").set(false)
                  return;
              }
                
              if (isDisputed) {
                  const notificationsRef = admin
                    .firestore()
                    .collection(`/users/${subVendData.data().author}/notifications`);
        
                  await notificationsRef.add({
                    type: "dispute",
                    details: {
                      vendlyRef,
                      subVend,
                      acctName: recipent.data.name,
                      acctNumber: actNum,
                      bankCode: bankCode,
                    },
                  });
                  await logRef.set({
                    createdAt: new Date(),
                    pending: isDisputed,
                    type: "scheduled"
                  });
                  await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                    await backendRTDRef.child("backend").child("boolean").set(false)
                    return;
                }
            } else {
              await logRef.set({
                createdAt: new Date(),
                status: "failed",
                type: "scheduled",
                message: "paystack returns status: false",
              });
            }
          } else if (transmission === "charity") {
            console.log("charity");
            const charityID = subVendData.data().to.charityID;
      
            const CharitybancAcctRef = admin
              .firestore()
              .collection(`/charities`)
              .doc(charityID);
      
            const CharitybancAcctData = await CharitybancAcctRef.get();
            // bankCode = CharitybancAcctData.data().bankRef;
            vendlyRef = CharitybancAcctData.data().bankRef;
            await subVendRef.set(
              {
                to: {
                  vendlyRef,
                },
              },
              { merge: true }
            );
      
            const bancAcctRef = admin
              .firestore()
              .collection(`/bankAccts`)
              .doc(vendlyRef);
      
            let [actNum, bankCode] = vendlyRef.split("_");
            let recipent = await fetchData(actNum, bankCode);
            console.log(recipent);
            // let dateNow = Date.now();
            // const logRef = admin
            //   .firestore()
            //   .collection(
            //     `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
            //   )
            //   .doc(`${dateNow}_scheduled`);
            if (recipent != null) {
              console.log("account name: ", recipent.data.name);
              console.log("recipent: ", recipent.data.recipient_code);
      
              // console.log(
              //   `slug: ${context.params.slug}, id: ${context.params.id}, subVend: ${subVend}`
              // );
      
              // console.log(
              //   `recipientCode: ${recipent.data.recipient_code}, bankName: ${recipent.data.details.bank_name}`
              // );
              await subVendRef.update(
                {
                  "to.recipientCode": recipent.data.recipient_code,
                  "to.bankName": recipent.data.details.bank_name,
                  "to.acctName": recipent.data.name,
                },
                { merge: true }
              );
              console.log("write to subVend");
      
              let remember = subVendData.data().to.remember,
                primary = subVendData.data().to.isPrimary;
              let vin = subVendData.data().claimant.uid;
              console.log(`remeber: ${remember}, primary: ${primary}, vin: ${vin}`);
              const RTDref = admin.database().ref(`users/${vin}/myCharity`);
      
              if (remember) {
=======
            }
          });
          // **************************************
        }
        if (!acctVerify && !isDisputed) {
          const payoutRef = admin
            .firestore()
            .collection(`/transactions/payouts/records`);
          // .doc(subVendData.data().vend);
          console.log('get payoutRef');

          let paystack = 'paystack',
            live = true;
          if (domain === 'test') {
            paysrack = 'paystack_test';
            live = false;
          } else if (domain === 'live') {
            paysrack = 'paystack_live';
            live = true;
          }

          await payoutRef.add({
            paystack: recipent.data.recipient_code,
            live,
            createdAt: new Date(),
            subVend,
            vend: subVendData.data().vend,
            amount: subVendData.data().to.amt,
            transmission: subVendData.data().to.transmission,
            claimantId: vin,
            sessionId: context.params.id,
          });
          console.log(`set the payOut`);
          if (acctVerify || isDisputed) {
            await logRef.set({
              createdAt: new Date(),
              status: 'pending',
              type: 'scheduled',
              message: '',
            });
          } else {
            await logRef.set({
              createdAt: new Date(),
              status: 'scheduled',
              type: 'scheduled',
              message: '',
            });
          }
          await backendRTDRef
            .child('backend')
            .child('time')
            .set(new Date().getTime());
          await backendRTDRef.child('backend').child('boolean').set(false);
          return;
        }

        if (acctVerify) {
          const notificationsRef = admin
            .firestore()
            .collection(`/users/${subVendData.data().author}/notifications`);

          await notificationsRef.add({
            type: 'acct-verify',
            details: {
              vendlyRef,
              subVend,
              acctName: recipent.data.name,
              acctNumber: actNum,
              bankCode: bankCode,
            },
          });
          await logRef.set({
            createdAt: new Date(),
            pending: acctVerify,
            type: 'scheduled',
          });
          await backendRTDRef
            .child('backend')
            .child('time')
            .set(new Date().getTime());
          await backendRTDRef.child('backend').child('boolean').set(false);
          return;
        }

        if (isDisputed) {
          const notificationsRef = admin
            .firestore()
            .collection(`/users/${subVendData.data().author}/notifications`);

          await notificationsRef.add({
            type: 'dispute',
            details: {
              vendlyRef,
              subVend,
              acctName: recipent.data.name,
              acctNumber: actNum,
              bankCode: bankCode,
            },
          });
          await logRef.set({
            createdAt: new Date(),
            pending: isDisputed,
            type: 'scheduled',
          });
          await backendRTDRef
            .child('backend')
            .child('time')
            .set(new Date().getTime());
          await backendRTDRef.child('backend').child('boolean').set(false);
          return;
        }
      } else {
        await logRef.set({
          createdAt: new Date(),
          status: 'failed',
          type: 'scheduled',
          message: 'paystack returns status: false',
        });
      }
    } else if (transmission === 'charity') {
      console.log('charity');
      const charityID = subVendData.data().to.charityID;

      const CharitybancAcctRef = admin
        .firestore()
        .collection(`/charities`)
        .doc(charityID);

      const CharitybancAcctData = await CharitybancAcctRef.get();
      // bankCode = CharitybancAcctData.data().bankRef;
      vendlyRef = CharitybancAcctData.data().bankRef;
      await subVendRef.set(
        {
          to: {
            vendlyRef,
          },
        },
        { merge: true },
      );

      const bancAcctRef = admin
        .firestore()
        .collection(`/bankAccts`)
        .doc(vendlyRef);

      let [actNum, bankCode] = vendlyRef.split('_');
      let recipent = await fetchData(actNum, bankCode);
      console.log(recipent);
      // let dateNow = Date.now();
      // const logRef = admin
      //   .firestore()
      //   .collection(
      //     `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${subVend}/logs`
      //   )
      //   .doc(`${dateNow}_scheduled`);
      if (recipent != null) {
        console.log('account name: ', recipent.data.name);
        console.log('recipent: ', recipent.data.recipient_code);

        // console.log(
        //   `slug: ${context.params.slug}, id: ${context.params.id}, subVend: ${subVend}`
        // );

        // console.log(
        //   `recipientCode: ${recipent.data.recipient_code}, bankName: ${recipent.data.details.bank_name}`
        // );
        await subVendRef.update(
          {
            'to.recipientCode': recipent.data.recipient_code,
            'to.bankName': recipent.data.details.bank_name,
            'to.acctName': recipent.data.name,
          },
          { merge: true },
        );
        console.log('write to subVend');

        let remember = subVendData.data().to.remember,
          primary = subVendData.data().to.isPrimary;
        let vin = subVendData.data().claimant.uid;
        console.log(`remeber: ${remember}, primary: ${primary}, vin: ${vin}`);
        const RTDref = admin.database().ref(`users/${vin}/myCharity`);

        if (remember) {
          await admin
            .database()
            .ref(`users/${vin}/myCharity/${charityID}`)
            .set({
              // acctNo: actNum,
              // bankCode: bankCode,
              // bankName: recipent.data.details.bank_name,
              isPrimary: primary,
            });
          console.log('write to RTD');
          // **********************
        }

        if (remember && primary) {
          // ***************************************
          await RTDref.once('value', async (snapshot) => {
            console.log(snapshot.val());
            for (const childKey in snapshot.val()) {
              // let childKey = childSnapshot.key;
              // var childData = childSnapshot.val();
              console.log(childKey);
              if (childKey === charityID) {
>>>>>>> 48a3cb395f95a6b764b99eed176bf515c1598511
                await admin
                  .database()
                  .ref(`users/${vin}/myCharity/${charityID}`)
                  .set({
                    // acctNo: actNum,
                    // bankCode: bankCode,
                    // bankName: recipent.data.details.bank_name,
                    isPrimary: primary,
                  });
                console.log("write to RTD");
                // **********************
              }
      
              if (remember && primary) {
                // ***************************************
                await RTDref.once("value", async (snapshot) => {
                  console.log(snapshot.val());
                  for (const childKey in snapshot.val()) {
                    // let childKey = childSnapshot.key;
                    // var childData = childSnapshot.val();
                    console.log(childKey);
                    if (childKey === charityID) {
                      await admin
                        .database()
                        .ref(`users/${vin}/myCharity/${childKey}`)
                        .update({
                          isPrimary: true,
                        });
                    } else {
                      await admin
                        .database()
                        .ref(`users/${vin}/myCharity/${childKey}`)
                        .update({
                          isPrimary: false,
                        });
                    }
                  }
                  // snapshot.val().forEach(async (childSnapshot) => {
                  //   let childKey = childSnapshot.key;
                  //   // var childData = childSnapshot.val();
                  //   await admin
                  //     .database()
                  //     .ref(`users/${vin}/myCharity/${childKey}`)
                  //     .update({
                  //       isPrimary: false,
                  //     });
                  // });
                });
      
                // await admin
                //   .database()
                //   .ref(`users/${vin}/myCharity/${charityID}`)
                //   .update({
                //     isPrimary: true,
                //   });
                // console.log("update primary");
                // **************************************
              }
              if (!acctVerify && !isDisputed) {
                const payoutRef = admin
                  .firestore()
                  .collection(`/transactions/payouts/records`);
                // .doc(subVendData.data().vend);
                console.log("get payoutRef");
      
                let paystack = "paystack",
                  live = true;
                if (domain === "test") {
                  paysrack = "paystack_test";
                  live = false;
                } else if (domain === "live") {
                  paysrack = "paystack_live";
                  live = true;
                }
      
                await payoutRef.add({
                  paystack: recipent.data.recipient_code,
                  live,
                  createdAt: new Date(),
                  subVend,
                  vend: subVendData.data().vend,
                  amount: subVendData.data().to.amt,
                  transmission: subVendData.data().to.transmission,
                  claimantId: vin,
                  sessionId: context.params.id,
                });
                console.log(`set the payOut`);
                if (acctVerify || isDisputed) {
                  await logRef.set({
                    createdAt: new Date(),
                    status: "pending",
                    type: "scheduled",
                    message: "",
                  });
                } else {
                  await logRef.set({
                    createdAt: new Date(),
                    status: "scheduled",
                    type: "scheduled",
                    message: "",
                  });
                }
                await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                await backendRTDRef.child("backend").child("boolean").set(false)
                return;
              }
      
              if (acctVerify) {
                const notificationsRef = admin
                  .firestore()
                  .collection(`/users/${subVendData.data().author}/notifications`);
      
                await notificationsRef.add({
                  type: "acct-verify",
                  details: {
                    vendlyRef,
                    subVend,
                    acctName: recipent.data.name,
                    acctNumber: actNum,
                    bankCode: bankCode,
                  },
                });
                await logRef.set({
                  createdAt: new Date(),
                  status: acctVerify,
                  type: "scheduled"
                });
                await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                await backendRTDRef.child("backend").child("boolean").set(false)
                return;
              }
                
              if (isDisputed) {
                  const notificationsRef = admin
                    .firestore()
                    .collection(`/users/${subVendData.data().author}/notifications`);
        
                  await notificationsRef.add({
                    type: "dispute",
                    details: {
                      vendlyRef,
                    subVend,
                    acctName: recipent.data.name,
                    acctNumber: actNum,
                    bankCode: bankCode,
                    },
                  });
                  await logRef.set({
                    createdAt: new Date(),
                    status: isDisputed,
                    type: "scheduled"
                  });
                  await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                    await backendRTDRef.child("backend").child("boolean").set(false)
                    return;
                }
            }
<<<<<<< HEAD
          } else if (transmission === "airtime") {
            let [actNum, bankCode] = vendlyRef.split("_");
            let remember = subVendData.data().to.remember,
              primary = subVendData.data().to.isPrimary;
            let vin = subVendData.data().claimant.uid;
            console.log(`remeber: ${remember}, primary: ${primary}, vin: ${vin}`);
            const RTDref = admin.database().ref(`users/${vin}/myPhoneNos`);
      
            if (remember) {
              const alias = subVendData.data().to.alias;
=======
            // snapshot.val().forEach(async (childSnapshot) => {
            //   let childKey = childSnapshot.key;
            //   // var childData = childSnapshot.val();
            //   await admin
            //     .database()
            //     .ref(`users/${vin}/myCharity/${childKey}`)
            //     .update({
            //       isPrimary: false,
            //     });
            // });
          });

          // await admin
          //   .database()
          //   .ref(`users/${vin}/myCharity/${charityID}`)
          //   .update({
          //     isPrimary: true,
          //   });
          // console.log("update primary");
          // **************************************
        }
        if (!acctVerify && !isDisputed) {
          const payoutRef = admin
            .firestore()
            .collection(`/transactions/payouts/records`);
          // .doc(subVendData.data().vend);
          console.log('get payoutRef');

          let paystack = 'paystack',
            live = true;
          if (domain === 'test') {
            paysrack = 'paystack_test';
            live = false;
          } else if (domain === 'live') {
            paysrack = 'paystack_live';
            live = true;
          }

          await payoutRef.add({
            paystack: recipent.data.recipient_code,
            live,
            createdAt: new Date(),
            subVend,
            vend: subVendData.data().vend,
            amount: subVendData.data().to.amt,
            transmission: subVendData.data().to.transmission,
            claimantId: vin,
            sessionId: context.params.id,
          });
          console.log(`set the payOut`);
          if (acctVerify || isDisputed) {
            await logRef.set({
              createdAt: new Date(),
              status: 'pending',
              type: 'scheduled',
              message: '',
            });
          } else {
            await logRef.set({
              createdAt: new Date(),
              status: 'scheduled',
              type: 'scheduled',
              message: '',
            });
          }
          await backendRTDRef
            .child('backend')
            .child('time')
            .set(new Date().getTime());
          await backendRTDRef.child('backend').child('boolean').set(false);
          return;
        }

        if (acctVerify) {
          const notificationsRef = admin
            .firestore()
            .collection(`/users/${subVendData.data().author}/notifications`);

          await notificationsRef.add({
            type: 'acct-verify',
            details: {
              vendlyRef,
              subVend,
              acctName: recipent.data.name,
              acctNumber: actNum,
              bankCode: bankCode,
            },
          });
          await logRef.set({
            createdAt: new Date(),
            status: acctVerify,
            type: 'scheduled',
          });
          await backendRTDRef
            .child('backend')
            .child('time')
            .set(new Date().getTime());
          await backendRTDRef.child('backend').child('boolean').set(false);
          return;
        }

        if (isDisputed) {
          const notificationsRef = admin
            .firestore()
            .collection(`/users/${subVendData.data().author}/notifications`);

          await notificationsRef.add({
            type: 'dispute',
            details: {
              vendlyRef,
              subVend,
              acctName: recipent.data.name,
              acctNumber: actNum,
              bankCode: bankCode,
            },
          });
          await logRef.set({
            createdAt: new Date(),
            status: isDisputed,
            type: 'scheduled',
          });
          await backendRTDRef
            .child('backend')
            .child('time')
            .set(new Date().getTime());
          await backendRTDRef.child('backend').child('boolean').set(false);
          return;
        }
      }
    } else if (transmission === 'airtime') {
      let [actNum, bankCode] = vendlyRef.split('_');
      let remember = subVendData.data().to.remember,
        primary = subVendData.data().to.isPrimary;
      let vin = subVendData.data().claimant.uid;
      console.log(`remeber: ${remember}, primary: ${primary}, vin: ${vin}`);
      const RTDref = admin.database().ref(`users/${vin}/myPhoneNos`);

      if (remember) {
        const alias = subVendData.data().to.alias;
        await admin
          .database()
          .ref(`users/${vin}/myPhoneNos/${subVendData.data().to.phoneRef}`)
          .set({
            // phoneRef: subVendData.data().to.phoneRef,
            isPrimary: primary,
            alias,
          });
        console.log('write to RTD');
        // **********************
      }

      if (remember && primary) {
        // ***************************************
        await RTDref.once('value', async (snapshot) => {
          console.log(snapshot.val());
          for (const childKey in snapshot.val()) {
            console.log(childKey);
            if (childKey === subVendData.data().to.phoneRef) {
>>>>>>> 48a3cb395f95a6b764b99eed176bf515c1598511
              await admin
                .database()
                .ref(`users/${vin}/myPhoneNos/${subVendData.data().to.phoneRef}`)
                .set({
                  // phoneRef: subVendData.data().to.phoneRef,
                  isPrimary: primary,
                  alias,
                });
              console.log("write to RTD");
              // **********************
            }
      
            if (remember && primary) {
              // ***************************************
              await RTDref.once("value", async (snapshot) => {
                console.log(snapshot.val());
                for (const childKey in snapshot.val()) {
                  console.log(childKey);
                  if (childKey === subVendData.data().to.phoneRef) {
                    await admin
                      .database()
                      .ref(`users/${vin}/myPhoneNos/${childKey}`)
                      .update({
                        isPrimary: true,
                      });
                  } else {
                    await admin
                      .database()
                      .ref(`users/${vin}/myPhoneNos/${childKey}`)
                      .update({
                        isPrimary: false,
                      });
                  }
                }
              });
              // **************************************
            }
            if (!acctVerify && !isDisputed) {
              const payoutRef = admin
                .firestore()
                .collection(`/transactions/payouts/records`);
              // .doc(subVendData.data().vend);
                console.log("get payoutRef");
                let paystack = "paystack",
                  live = true;
                if (domain === "test") {
                  paysrack = "paystack_test";
                  live = false;
                } else if (domain === "live") {
                  paysrack = "paystack_live";
                  live = true;
                }
      
              await payoutRef.add({
                // paystack: recipent.data.recipient_code,
                // live,
                createdAt: new Date(),
                subVend,
                vend: subVendData.data().vend,
                amount: live?subVendData.data().to.amt:50,
                transmission: subVendData.data().to.transmission,
                phoneRef: subVendData.data().to.phoneRef,
                subVend,
                claimantId: vin,
                sessionId: context.params.id,
              });
              console.log(`set the payOut`);
              if (acctVerify || isDisputed) {
                await logRef.set({
                  createdAt: new Date(),
                  status: "pending",
                  type: "scheduled",
                  message: "",
                });
              } else {
                await logRef.set({
                  createdAt: new Date(),
                  status: "scheduled",
                  type: "scheduled",
                  message: "",
                });
              }
              await backendRTDRef.child("backend").child("time").set(new Date().getTime())
              await backendRTDRef.child("backend").child("boolean").set(false)
              return;
            }
      
            if (acctVerify) {
              const notificationsRef = admin
                .firestore()
                .collection(`/users/${subVendData.data().author}/notifications`);
      
              await notificationsRef.add({
                type: "acct-verify",
                details: {
                  vendlyRef,
                  subVend,
                  acctNumber: actNum,
                  bankCode: bankCode,
                },
              });
              await backendRTDRef.child("backend").child("time").set(new Date().getTime())
              await backendRTDRef.child("backend").child("boolean").set(false)
              return;
            }
              
            if (isDisputed) {
              const notificationsRef = admin
                .firestore()
                .collection(`/users/${subVendData.data().author}/notifications`);
      
              await notificationsRef.add({
                type: "dispute",
                details: {
                  vendlyRef,
                  subVend,
                  acctNumber: actNum,
                  bankCode: bankCode,
                },
              });
              await logRef.set({
                createdAt: new Date(),
                status: isDisputed,
                type: "scheduled"
              });
              await backendRTDRef.child("backend").child("time").set(new Date().getTime())
                await backendRTDRef.child("backend").child("boolean").set(false)
                return;
            }
          }
<<<<<<< HEAD
          // }
          // else {
          //   await logRef.set({
          //     createdAt: new Date(),
          //     status: "failed",
          //     type: "scheduled",
          //     message: "paystack returns status: false",
          //   });
          // }
      
          console.log("end the function");
    } catch (error) {
        console.log("end the function", "scheduler", error);
    }
=======
        });
        // **************************************
      }
      if (!acctVerify && !isDisputed) {
        const payoutRef = admin
          .firestore()
          .collection(`/transactions/payouts/records`);
        // .doc(subVendData.data().vend);
        console.log('get payoutRef');
        let paystack = 'paystack',
          live = true;
        if (domain === 'test') {
          paysrack = 'paystack_test';
          live = false;
        } else if (domain === 'live') {
          paysrack = 'paystack_live';
          live = true;
        }

        await payoutRef.add({
          // paystack: recipent.data.recipient_code,
          // live,
          createdAt: new Date(),
          subVend,
          vend: subVendData.data().vend,
          amount: live ? subVendData.data().to.amt : 50,
          transmission: subVendData.data().to.transmission,
          phoneRef: subVendData.data().to.phoneRef,
          subVend,
          claimantId: vin,
          sessionId: context.params.id,
        });
        console.log(`set the payOut`);
        if (acctVerify || isDisputed) {
          await logRef.set({
            createdAt: new Date(),
            status: 'pending',
            type: 'scheduled',
            message: '',
          });
        } else {
          await logRef.set({
            createdAt: new Date(),
            status: 'scheduled',
            type: 'scheduled',
            message: '',
          });
        }
        await backendRTDRef
          .child('backend')
          .child('time')
          .set(new Date().getTime());
        await backendRTDRef.child('backend').child('boolean').set(false);
        return;
      }

      if (acctVerify) {
        const notificationsRef = admin
          .firestore()
          .collection(`/users/${subVendData.data().author}/notifications`);

        await notificationsRef.add({
          type: 'acct-verify',
          details: {
            vendlyRef,
            subVend,
            acctNumber: actNum,
            bankCode: bankCode,
          },
        });
        await backendRTDRef
          .child('backend')
          .child('time')
          .set(new Date().getTime());
        await backendRTDRef.child('backend').child('boolean').set(false);
        return;
      }

      if (isDisputed) {
        const notificationsRef = admin
          .firestore()
          .collection(`/users/${subVendData.data().author}/notifications`);

        await notificationsRef.add({
          type: 'dispute',
          details: {
            vendlyRef,
            subVend,
            acctNumber: actNum,
            bankCode: bankCode,
          },
        });
        await logRef.set({
          createdAt: new Date(),
          status: isDisputed,
          type: 'scheduled',
        });
        await backendRTDRef
          .child('backend')
          .child('time')
          .set(new Date().getTime());
        await backendRTDRef.child('backend').child('boolean').set(false);
        return;
      }
    }
    // }
    // else {
    //   await logRef.set({
    //     createdAt: new Date(),
    //     status: "failed",
    //     type: "scheduled",
    //     message: "paystack returns status: false",
    //   });
    // }

    console.log('end the function');
>>>>>>> 48a3cb395f95a6b764b99eed176bf515c1598511
  });

exports.pay = functions.firestore
  .document('/transactions/payouts/records/{id}')
  .onCreate(async (snap, context) => {
<<<<<<< HEAD
    try {
        console.log("function started");
=======
    console.log('function started');
>>>>>>> 48a3cb395f95a6b764b99eed176bf515c1598511
    let vendId = snap.data().vend,
      amount = snap.data().amount,
      recipient = snap.data().paystack,
      subvend = snap.data().subVend,
      claimantId = snap.data().claimantId,
      sessionId = snap.data().sessionId,
      phoneRef = snap.data().phoneRef,
      transmission = snap.data().transmission;

    const vendRef = admin.firestore().collection(`/vends`).doc(vendId);
    const subvendRef = admin
      .firestore()
      .collection(`/vends/${vendId}/sessions/${sessionId}/subVend`)
      .doc(subvend);
    const subvendData = await subvendRef.get();
    const vend = await vendRef.get();
    let active = vend.data().active;

    if (active) {
      const reference = `${subvend}_${vendId}_${recipient}_${Math.floor(
        Math.random() * 10000000000000000,
      )}_${sessionId}`;

      let notDeplucated = true;
      await admin
        .firestore()
        .collection(`/transactions/payouts/records`)
        .get()
        .then(function (querySnapshot) {
          querySnapshot.forEach(function (doc) {
            // doc.data() is never undefined for query doc snapshots
            // console.log(doc.id, " => ", doc.data());
            if (
              doc.data().success &&
              doc.data().success.ref &&
              doc.data().success.ref === reference
            ) {
              notDeplucated = false;
            }
          });
        });

      if (notDeplucated) {
        let dateNow = Date.now();

        const userRef = admin
          .firestore()
          .collection(
            `/vends/${vendId}/sessions/${sessionId}/subVend/${subvend}/logs`,
          )
          .doc(`${dateNow}_paid`);
        console.log('get userRef');

        const payoutRef = admin
          .firestore()
          .collection(`/transactions/payouts/records`)
          .doc(`${context.params.id}`);
        let initialTransferData, initialTransfer, status;
        if (transmission === 'bank' || transmission === 'charity') {
          console.log(functions.config().paystack_test.secret_key);
          initialTransferData = await fetch(
            `https://api.paystack.co/transfer`,
            {
              method: 'POST',
              body: JSON.stringify({
                source: 'balance',
                reason: 'vendly',
                amount: amount * 100,
                recipient,
                currency: 'NGN',
                reference: reference.toLowerCase(),
              }),
              headers: {
                Authorization: `Bearer ${
                  functions.config().paystack_test.secret_key
                }`,
                'Content-Type': 'application/json',
              },
            },
          );
          initialTransfer = await initialTransferData.json();
          await functions.logger.info(initialTransfer);
          status = initialTransfer.status;
          if (status) {
            payoutRef.set(
              {
                success: {
                  isSuccess: status,
                  ref: initialTransfer.data.transfer_code,
                  successAt: new Date(),
                },
                tries: 1,
              },
              { merge: true },
            );
            console.log('update the payouts');

            await userRef.set({
              ref: initialTransfer.data.transfer_code,
              createdAt: new Date(),
              status: 'success',
              type: 'paid',
              message: '',
            });
          } else {
            payoutRef.set(
              {
                // bankRef: initialTransfer,
                success: {
                  isSuccess: status,
                  successAt: new Date(),
                },
                tries: 1,
              },
              { merge: true },
            );
            console.log('update the payouts');

            await userRef.set({
              createdAt: new Date(),
              status: 'failed',
              type: 'paid',
              message: 'paystack returns status: false',
            });
            await vendRef.update({
              active: false,
            });
          }
        } else if (transmission === 'airtime') {
          console.log(functions.config().flutterwave.secret_key);
          initialTransferData = await fetch(
            `https://api.flutterwave.com/v3/bills`,
            {
              method: 'POST',
              body: JSON.stringify({
                country: 'NG',
                customer: phoneRef.split('_')[0],
                amount: amount,
                recurrence: 'ONCE',
                type: 'AIRTIME',
                reference: reference.toLowerCase(),
              }),
              headers: {
                Authorization: `Bearer ${
                  functions.config().flutterwave.secret_key
                }`,
                'Content-Type': 'application/json',
              },
            },
          );
          initialTransfer = await initialTransferData.json();
          await functions.logger.info(initialTransfer);
          status = initialTransfer.status;
          if (status) {
            payoutRef.set(
              {
                success: {
                  isSuccess: status,
                  ref: initialTransfer.data.flw_ref,
                  successAt: new Date(),
                },
                tries: 1,
              },
              { merge: true },
            );
            console.log('update the payouts');

            await userRef.set({
              ref: initialTransfer.data.flw_ref,
              createdAt: new Date(),
              status: 'success',
              type: 'paid',
              message: '',
            });

            // ************************************************
            const transferRef = admin
              .firestore()
              .collection(`/paystack/events/transferSuccess/meta/log`)
              .doc(reference);

            await transferRef.set({
              createdAt: new Date(),
            });

            console.log('log to transferSuccess');

            // ************************************************
            const metaTransferRef = admin
              .firestore()
              .collection(`/paystack/events/transferSuccess`)
              .doc('meta');

            try {
              await admin.firestore().runTransaction(async (t) => {
                const doc = await t.get(metaTransferRef);
                if (status) {
                  t.update(metaTransferRef, {
                    count: {
                      live: doc.data().count.live + 1,
                    },
                    lastUpdated: new Date(),
                  });
                }
              });
              console.log('update transferSuccess');
            } catch (e) {
              console.log('update transferSuccess:', e);
            }
          } else {
            payoutRef.set(
              {
                // bankRef: initialTransfer,
                success: {
                  isSuccess: status,
                  successAt: new Date(),
                },
                tries: 1,
              },
              { merge: true },
            );
            console.log('update the payouts');

            await userRef.set({
              createdAt: new Date(),
              status: 'failed',
              type: 'paid',
              message: 'paystack returns status: false',
            });
            await vendRef.update({
              active: false,
            });
          }
        }

        //*********************************************************************/
        if (status) {
          const matePayoutRef = admin
            .firestore()
            .collection(`/transactions`)
            .doc('payouts');

          try {
            await admin.firestore().runTransaction(async (t) => {
              const doc = await t.get(matePayoutRef);
              if (status) {
                const newCount = doc.data().count + 1;
                const newAmount = doc.data().totalAmt + amount;
                const newSuccessful = doc.data().successful + 1;
                const days = Math.floor(
                  Math.abs(new Date() - doc.data().refDate.toDate()) /
                    (1000 * 60 * 60 * 24),
                );
                t.update(matePayoutRef, {
                  count: newCount,
                  totalAmt: newAmount,
                  successful: newSuccessful,
                  dailyAverage: Math.ceil(newAmount / days),
                });
                console.log(days);
              } else {
                const newFailled = doc.data().failed + 1;
                t.update(matePayoutRef, { failed: newFailled });
              }
            });
            console.log('Transaction success!');
          } catch (e) {
            console.log('Transaction failure:', e);
          }

          // ************************************************
          const fundingRef = admin
            .firestore()
            .collection(`/vends/${vendId}/vault`)
            .doc('funding');

          try {
            await admin.firestore().runTransaction(async (t) => {
              const doc = await t.get(fundingRef);
              if (status) {
                t.update(fundingRef, {
                  inPlay: doc.data().inPlay - amount,
                });
              }
            });
            console.log('Substracts from inplay');
          } catch (e) {
            console.log('Substracts from inplay failure:', e);
          }

          // ************************************************

          const sessionRef = admin
            .firestore()
            .collection(`/vends/${vendId}/sessions`)
            .doc(sessionId);

          await sessionRef.update({
            state: 'paid',
          });

          console.log('update vendsession state');

          // ************************************************

          const myVendRef = admin
            .firestore()
            .collection(`/users/${claimantId}/myVends`)
            .doc('won');
          console.log('get myVendRef');

          const myVendData = await myVendRef.get();

          console.log(claimantId);
          console.log(myVendData.data().count);
          await myVendRef.set(
            {
              count: myVendData.data().count + 1,
              vendId,
              state: 'claimed',
            },
            { merge: true },
          );

          console.log('update won');

          // ************************************************

          console.log(subvendData.data().author.uid);
          const authorNotificationsRef = admin
            .firestore()
            .collection(
              `/users/${subvendData.data().author.uid}/notifications`,
            );

          const res1 = await authorNotificationsRef.add({
            type: 'vend_claimed',
            details: {
              claimantId,
              amount,
              vendId,
              createdAt: new Date(),
            },
          });

          console.log('notify author');
          console.log('Added document with ID: ', res1.id);

          // ************************************************

          console.log(claimantId);
          const notificationsRef = admin
            .firestore()
            .collection(`/users/${claimantId}/notifications`);

          const res2 = await notificationsRef.add({
            type: 'claim_success',
            details: {
              authorId: subvendData.data().author.uid,
              amount,
              vendId,
              createdAt: new Date(),
            },
          });

          console.log('notify claimant');
          console.log('Added document with ID: ', res2.id);
        }
      } else {
        console.log('duplicated ref');
      }
    } else {
      console.log('inactive vend');
    }
    } catch (error) {
        console.log("end the function", "pay", error);
    }
  });

exports.rewarder = functions.firestore
  .document('/vends/{slug}/sessions/{id}/subVend/{sub}/states/accepted')
  .onWrite(async (change, context) => {
    try{
      if (!change.after.exists) {
      return null;
    }
    let claimantID = context.params.id;
    let vendID = context.params.slug;
    let uidSha = crypto
      .createHash('sha256')
      .update(claimantID + vendID, 'utf8')
      .digest('hex');
    let backendRTDRef = admin
      .database()
      .ref(`/vends/${vendID}/knocks/attempts/${uidSha}/subvend/`);
    let backendData = await (await backendRTDRef.once('value')).val();
    let subvendLogs = admin
      .firestore()
      .collection(
        `/vends/${context.params.slug}/sessions/${context.params.id}/subVend`,
      )
      .doc(`${context.params.sub}`)
      .collection('logs');

    if (
      (!backendData && !backendData.backend && backendData.backend.boolean) ||
      moment().diff(new Date(backendData.backend.time), 'minutes') <= 1
    ) {
      // log and stop
      let log = {
        uid: context.params.id,
        status: 303,
        critical: true,
        createdAt: new Date(),
        message: 'Task currently running. Try later',
      };
      await subvendLogs.doc(new Date().getTime()).set(log);
      return null;
    } else {
      await backendRTDRef
        .child('backend')
        .child('time')
        .set(new Date().getTime());
      await backendRTDRef.child('backend').child('boolean').set(true);
    }

    //   check session status
    let sessionRef = admin
      .firestore()
      .collection(`/vends/${context.params.slug}/sessions`)
      .doc(`${context.params.id}`);
    let sessionInfo = (await sessionRef.get()).data();
    if (sessionInfo.state !== 'won') {
      let log = {
        uid: context.params.id,
        status: 302,
        critical: true,
        createdAt: new Date(),
        message: 'user no longer eligible',
      };
      await subvendLogs.doc(new Date().getTime()).set(log);
      await backendRTDRef
        .child('backend')
        .child('time')
        .set(new Date().getTime());
      await backendRTDRef.child('backend').child('boolean').set(false);
      return null;
    }

    // check vend success collection
    let successRef = admin
      .firestore()
      .collection(`/vends/${context.params.slug}/success`)
      .doc(`${context.params.id}`);
    let successInfo = await successRef.get();
    if (successInfo.exists) {
      let log = {
        uid: context.params.id,
        status: 302,
        critical: true,
        createdAt: new Date(),
        message: 'user already claimed vend',
      };
      await subvendLogs.doc(new Date().getTime()).set(log);
      await sessionRef.set({ state: 'closed' }, { merge: true });
      await backendRTDRef.child('status').set('closed');
      await backendRTDRef
        .child('backend')
        .child('time')
        .set(new Date().getTime());
      await backendRTDRef.child('backend').child('boolean').set(false);
      return null;
    }
    console.log('function started');

    const subvendRef = admin
      .firestore()
      .collection(
        `/vends/${context.params.slug}/sessions/${context.params.id}/subVend`,
      )
      .doc(`${context.params.sub}`);

    const subvendData = await subvendRef.get();

    let amount = subvendData.data().to.amt,
      author = subvendData.data().author.uid,
      claimant = subvendData.data().claimant.uid,
      isJoin = subvendData.data().isJoin,
      vend = subvendData.data().vend,
      transmission = change.after.data().transmission,
      to = subvendData.data().to,
      reward = subvendData.data().reward,
      isPrimary = change.after.data().isPrimary,
      remember = change.after.data().remember,
      acctVerify = subvendData.data().acctVerify,
      expiry = subvendData.data().expiry,
      phoneRef = change.after.data().phoneRef,
      charityID = change.after.data().charity,
      alias = change.after.data().alias,
      createdAt = subvendData.data().createdAt._seconds * 1000;

    const resolveRef = admin
      .firestore()
      .collection(
        `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/actions`,
      )
      .doc(`resolve`);

    const resolveData = await resolveRef.get();
    const vendlyRef = resolveData.data().vendlyRef;
    const resolveSubvend = resolveData.data().subVend;

    function randomString(length, chars) {
      var result = '';
      for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
      return result;
    }

    // const joinId = randomString(
    //   8,
    //   "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    // );

    // const joinRef = admin
    //   .firestore()
    //   .collection(`/links/Join/metatags`)
    //   .doc(`${joinId}`);

    // const joinLink = await joinRef.get();
    // while (joinLink.exists) {
    //   joinId = randomString(
    //     8,
    //     "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    //   );
    //   joinLink = await admin
    //     .firestore()
    //     .collection(`/links/Join/metatags`)
    //     .doc(joinId)
    //     .get();
    // }
    console.log(
      resolveSubvend,
      change.after.data().subVend,
      vendlyRef,
      change.after.data().vendlyRef,
      // joinId
    );
    if (
      (vendlyRef !== change.after.data().vendlyRef ||
        resolveSubvend !== change.after.data().subVend) &&
      transmission === 'bank'
    ) {
      await subvendLogs.doc(new Date().getTime()).set({
        message: 'Type mismatch',
        timestamp: new Date().getTime(),
        createdAt: new Date(),
        critical: true,
        status: 601,
        uid: context.params.id,
      });
      await backendRTDRef
        .child('backend')
        .child('time')
        .set(new Date().getTime());
      await backendRTDRef.child('backend').child('boolean').set(false);

      console.log('vendlyRef or acctName is wrong');
    } else {
      let mainLog = await (await subvendLogs.doc('main').get()).data();
      let acceptedRef = admin
        .firestore()
        .collection(
          `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/states`,
        )
        .doc(`accepted`);
      let acceptedDoc = (await acceptedRef.get()).data();

      if (
        mainLog.transmissions[acceptedDoc.transmissionCode] !==
        acceptedDoc.transmission
      ) {
        await subvendLogs.doc(new Date().getTime()).set({
          message: 'transmission mismatch',
          timestamp: new Date().getTime(),
          createdAt: new Date(),
          critical: true,
          status: 602,
          uid: context.params.id,
        });
        await backendRTDRef
          .child('backend')
          .child('time')
          .set(new Date().getTime());
        await backendRTDRef.child('backend').child('boolean').set(false);
        return null;
      }

      functions.logger.log(createdAt);
      const dateNow = new Date();
      functions.logger.log(dateNow.getTime());
      const expireTime = Math.abs(dateNow - createdAt);
      functions.logger.log(expireTime);
      if (expireTime > 60 * 60 * 1000 * expiry) {
        await subvendLogs.doc(new Date().getTime()).set({
          message: 'subvend expired',
          timestamp: new Date().getTime(),
          createdAt: new Date(),
          critical: true,
          status: 603,
          uid: context.params.id,
        });
        await backendRTDRef
          .child('backend')
          .child('time')
          .set(new Date().getTime());
        await backendRTDRef.child('backend').child('boolean').set(false);

        console.log('subVend expired expired');
        return null;
      }
      await subvendRef.set(
        {
          reward: {
            // code: joinId,
            type: 'claimed',
            time: new Date(Date.now()).toLocaleString(),
          },
        },
        { merge: true },
      );
      await resolveRef.set(
        {
          attempts: 0,
        },
        { merge: true },
      );

      console.log('setting attempts to 0');

      await subvendRef.set(
        {
          // code: joinId,
          isRewarded: true,
          time: new Date(),
          to: {
            acctName: to.acctName,
            vendlyRef,
            time: new Date(),
            isPrimary,
            remember,
            transmission,
            bankName: to.bankName,
            phoneRef,
            charityID,
            alias,
          },
        },
        { merge: true },
      );

      console.log('updating subvend');

      // if (isJoin) {
      //   await joinRef.set({
      //     ref: subvendData.data().claimant.vin,
      //     sen: subvendData.data().author.handle,
      //     amt: amount,
      //     createdAt: new Date(Date.now()).toLocaleString(),
      //   });

      //   console.log("add join link");
      // }

      const rewardRef = admin
        .firestore()
        .collection(
          `/vends/${context.params.slug}/sessions/${context.params.id}/subVend/${context.params.sub}/actions`,
        )
        .doc('reward');
      console.log('get rewardRef');

      const acctVerifyValue = acctVerify && transmission === 'bank';

      await rewardRef.set(
        {
          acctVerify: acctVerifyValue,
          isUserDisputed: subvendData.data().claimant.userDisputed,
          // vendlyRef,
          reward: true,
          subVend: context.params.sub,
        },
        { merge: true },
      );

      console.log('set or update reward doc');

      const myVendRef = admin
        .firestore()
        .collection(`/users/${claimant}/myVends`)
        .doc('won');
      console.log('get myVendRef');

      const myVendData = await myVendRef.get();

      console.log(claimant);
      console.log(myVendData.data().count);
      await myVendRef.set(
        {
          count: myVendData.data().count + 1,
          vend,
          state: 'claimed',
        },
        { merge: true },
      );
      await subvendLogs.doc(new Date().getTime() + '_rewarded').set({
        message: 'success',
        createdAt: new Date(),
        critical: true,
        type: 'rewarded',
        status: 602,
        uid: context.params.id,
      });
      await backendRTDRef
        .child('backend')
        .child('time')
        .set(new Date().getTime());
      await backendRTDRef.child('backend').child('boolean').set(false);
      console.log('update won');
    }
      
} catch (error) {
    console.log("end the function", "pay", error);
}
  });

exports.confirmation = functions.firestore
  .document('/paystack/events/transferSuccess/meta/log/{id}')
  .onCreate(async (snap, context) => {
    const idsArray = context.id.split('_'),
      subvendId = idsArray[0],
      vendId = idsArray[1],
      sessionId = idsArray[idsArray.length - 1],
      now = Date.now(),
      logId = `${now}_confirmed`;

    const subvendRef = admin
      .firestore()
      .collection(`/vends/${vendId}/sessions/${sessionId}/subVend`)
      .doc(subvendId);

    const subvendData = await subvendRef.get();

    let userId = subvendData.data().claimant.uid;

    const logRef = admin
      .firestore()
      .collection(
        `/vends/${vendId}/sessions/${sessionId}/subVend/${subvendId}/logs`,
      )
      .doc(logId);
    console.log('get logRef');
    await logRef.set({
      createdAt: new Date(),
      reference: context.id.toLowerCase(),
    });
    console.log('write log ');

    // *********************************************************************************************************************

    const myVendRef = admin
      .firestore()
      .collection(`/users/${userId}/myVends/attempted/vends`)
      .doc(vendId);

    await myVendRef.update({
      state: firebase.firestore.FieldValue.arrayUnion({
        createdAt: new Date(),
        type: 'paid',
      }),
    });
    console.log('write myvend');

    // *********************************************************************************************************************

    await subvendRef.set(
      {
        reward: {
          isConfirmed: true,
        },
      },
      { merge: true },
    );
    console.log('confirm subvend');

    // *********************************************************************************************************************

    const sessionRef = admin
      .firestore()
      .collection(`/vends/${vendId}/sessions`)
      .doc(sessionId);

    await sessionRef.update({
      state: 'closed',
    });
    console.log('close session');

    // *********************************************************************************************************************

    const claimantId = subvendData.data().claimant.uid;

    const successRef = admin
      .firestore()
      .collection(`/vends/${vendId}/success`)
      .doc(`${now}_${claimantId}`);

    await successRef.set({
      createdAt: new Date(),
    });
    console.log('close session');

    // *********************************************************************************************************************

    const claimCount = admin
      .database()
      .ref(`vends/${vendId}/public/claimCount`);

    claimCount.set(admin.database.ServerValue.increment(1));
    console.log('update claimCount');

    // *********************************************************************************************************************

    const userRef = admin.firestore().collection(`/users`).doc(userId);

    await userRef.update({
      reward: {
        count: admin.firestore.FieldValue.increment(1),
      },
    });

    let rewardCount = await (await userRef.get()).data().reward.count;
    if (rewardCount > 10) {
      await userRef.update({
        reward: {
          requiredPin: true,
        },
      });
    }

    console.log('update reward count');

    // *********************************************************************************************************************

    const strap = subvendData.data().strap;

    const hashedStrap = crypto
      .createHash('sha256')
      .update(strap)
      .digest('base64');
    console.log('hashed strap : ' + hashedStrap);

    const hashedClaimant = `${hashedClaimant}_${vendId}`;

    const claimants = admin.database().ref(`vends/${vendId}/claimants`);
    await claimants.update({
      reward: {
        [hashedClaimant]: now,
      },
    });

    console.log('update claimants');

    // *********************************************************************************************************************

    const vendRef = admin.firestore().collection(`/vends`).doc(vendId);
    const vendData = await vendRef.get();
    const vendType = vendData.data().type;
    if (vendType === 'money' || vendType === 'gift') {
      let strapPhoneRef = admin
        .firestore()
        .collection(`/vends/${vendId}/strap/meta/phone`)
        .doc(strap);
      let strapTwitterRef = admin
        .firestore()
        .collection(`/vends/${vendId}/strapmeta/twitter`)
        .doc(strap);
      if (strapPhoneRef.exists) {
        strapPhoneRef.update({
          isWon: true,
        });
      } else if (strapTwitterRef.exists) {
        strapTwitterRef.update({
          isWon: true,
        });
      }
    }

    console.log('update isWon');

    // *********************************************************************************************************************

    let allPhoneWon = true;
    admin
      .firestore()
      .collection(`/vends/${vendId}/strap/meta/phone`)
      .get()
      .then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
          if (doc.data().isWon === false) {
            allPhoneWon = false;
          }
        });
      });

    if (allPhoneWon) {
      const publicRef = admin.database().ref(`vends/${vendId}/public`);
      await publicRef.update({
        isPhone: false,
      });

      console.log('update isPhone');
    }

    // *********************************************************************************************************************
    const slug = vendData.data().slug;
    const link = vendData.data().link;

    const fundingRef = admin
      .firestore()
      .collection(`/vends/${vendId}/vault`)
      .doc(funding);
    const fundingData = await fundingRef.get();

    const isEmptied = fundingData.data().isEmptied;

    if (isEmptied) {
      const linkRef = admin.firestore().collection(link).doc(slug);

      await linkRef.update({
        state: 'exhausted',
      });
      console.log('change state to exhausted');
    }
  });

exports.vendhook = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  const secretKey = 'sk_test_64c5be8f7e134b8ac246dec64b212466ab757dcf';
  //validate event
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(req.body))
    .digest('hex');

  console.log(`hask ===> ${hash}`);
  console.log(`header ===> ${req.headers['x-paystack-signature']}`);

  // Retrieve the request's body
  const event = req.body;
  console.log(event);
  if (hash === req.headers['x-paystack-signature']) {
    const batch = db.batch();
    let mode = 'test';
    try {
      if (event.data.domain !== 'test') {
        mode = 'live';
      }
    } catch (e) {
      mode = 'live';
    }
    let eventType = event.event;

    if (
      eventType === 'charge.success' ||
      eventType === 'transfer.success' ||
      eventType === 'transfer.failed' ||
      eventType === 'transfer.reversed' ||
      eventType === 'dispute.created' ||
      eventType === 'dispute.reminder' ||
      eventType === 'dispute.resolved'
    ) {
      eventType = event.event;
      switch (event.event) {
        case 'charge.success':
          eventType = 'chargeSuccess';
          break;
        case 'transfer.success':
          eventType = 'transferSuccess';
          break;
        case 'transfer.failed':
          eventType = 'transferFailed';
          break;
        case 'transfer.reversed':
          eventType = 'transferReversed';
          break;
        case 'dispute.created':
          eventType = 'disputeCreated';
          break;
        case 'dispute.reminder':
          eventType = 'disputeReminder';
          break;
        case 'dispute.resolved':
          eventType = 'disputeResolved';
          break;
        default:
          eventType = 'misc';
      }
    } else {
      eventType = 'misc';
    }
    const eventPath = `/paystack/events/${eventType}/meta/log`;
    const metaPath = `/paystack/events/${eventType}/meta`;

    const meta = await db.doc(metaPath).get();

    const metaData = meta.data();

    const eventRef = db
      .collection(eventPath)
      .doc(`${event.data.reference}_${event.data.id}`);
    try {
      event.data.amount = event.data.amount / 100;
      event.data.requested_amount = event.data.requested_amount / 100;
    } catch (e) {
      console.log(e);
    }
    batch.set(eventRef, {
      createdAt: admin.firestore.Timestamp.now(),
      payload: event,
    });
    let count = 0;
    let live = 0;
    if (mode === 'test') {
      count = 1;
    } else {
      live = 1;
    }
    try {
      if (mode === 'test') {
        count = metaData.count.test + 1;
        live = metaData.count.live;
      } else {
        count = metaData.count.test;
        // live = metaData.count.live + 1;
        live = admin.firestore.FieldValue.increment(1);
      }
    } catch (e) {
      console.log(e);
    }
    const metaRef = db.doc(metaPath);
    batch.update(metaRef, {
      count: {
        test: count,
        live: live,
      },
      lastUpdated: admin.firestore.Timestamp.now(),
    });

    try {
      await batch.commit();
      return res.status(200).send(200);
    } catch (e) {
      return res.status(422).send({ error: e.toString() });
    }
  } else {
    //invalidate events
    const batch = db.batch();

    const eventPath = `/paystack/events/unverified/meta/log`;
    const unverifiedPath = `/paystack/events/unverified/meta`;

    const unverified = await db.doc(unverifiedPath).get();

    const unverifiedData = unverified.data();

    const eventRef = db.collection(eventPath).doc();
    batch.set(eventRef, {
      createdAt: admin.firestore.Timestamp.now(),
      payload: event,
    });

    let count = 1;
    try {
      count = unverifiedData.count + 1;
      count = admin.firestore.FieldValue.increment(1);
    } catch (e) {
      console.log(e);
    }

    const unverifiedRef = db.doc(unverifiedPath);
    batch.update(unverifiedRef, {
      count: count,
    });

    try {
      await batch.commit();
      return res.status(200).send(200);
    } catch (e) {
      return res.status(422).send({ error: e.toString() });
    }
  }
});

// QueryDocumentSnapshot

// 1st (Create Recipient and store unique Paystack reference)
// https://paystack.com/docs/api/#transfer-recipient-create

// 2nd (Initiate transfer with Recipient Reference)
// https://paystack.com/docs/api/#transfer-initiate

// 3rd (Finalize transfer)
// https://paystack.com/docs/api/#transfer-finalize

// 0028987869
// 058

// 1. Pay********
// 2. Vendsense*
// 3. Rewarder*********
// 4. Resolver*********
// 5. Scheduler********

// But I'll try to explain. Custom claims are extra details on user access tokens that enable to user access specific parts of a database.

// In this case, the custom claim is the subVend, so that the user can read write to the subVend records while interacting during vend claim. Once they are done interacting, there would be no need to have the custom claims, the function with its admin sdk will remove the custom claim from the user's access token then notify the client to refresh their token. Once refreshed, it wouldn't exist anymore

// So it will basically remove custom claim then revoke access. So that the user is forced to refresh their token

// So 3 things you should learn quickly

// - removing custom claims
// - revoking user access
// - notifying client
