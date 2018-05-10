import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { HomePage } from '../pages/home/home';
import { Diagnostic } from '@ionic-native/diagnostic';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage: any;// = HomePage;

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, public diagnostic: Diagnostic) {
    platform.ready().then(() => {

      let permissions = [
        this.diagnostic.permission.CAMERA,
        this.diagnostic.permission.RECORD_AUDIO
      ];

      this.diagnostic.requestRuntimePermissions(permissions)
        .then(data => {
      this.rootPage = HomePage;
        })
        .catch((err) => {
          alert("Erro ao solicitar permissão")
          alert(JSON.stringify(err));
        });
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
    });
  }
}
