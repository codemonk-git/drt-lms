import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    return android;
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDkOAhfM9T08G_LScPfyLkaOW6W62ijSL0',
    appId: '1:775722913264:android:9a612056bf47878bd32135',
    messagingSenderId: '775722913264',
    projectId: 'leads-tss',
    storageBucket: 'leads-tss.firebasestorage.app',
  );
}
