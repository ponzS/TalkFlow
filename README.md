
![talkflow](https://github.com/user-attachments/assets/83733bed-e28d-4b3f-af6a-6212e3ed402a)

# Decentralized artificial intelligence application

What is TalkFlow?
![ios](https://github.com/user-attachments/assets/587f732c-3b68-4c50-8959-1ef01ba44626)

1.Decentralized end-to-end encrypted chat application.

2.Decentralized artificial intelligence communication tools.

3.Decentralized general AI controller.

4.Decentralized Internet of Things controller.

5.Global decentralized distributed mesh communication network artificial intelligence data solution.

Decentralized artificial intelligence - robots - drones - communication facilities

# Design
We hope to use portable devices in our pockets to connect with the private artificial intelligence deployed at home anytime and anywhere. At the same time, our private artificial intelligence will help us solve everything. No matter where you are, Gun-Relay will provide you with powerful decentralized communication power.

We assume the design scenario of a controller. We use mobile devices to send a message to AI, which is to let our drone take off, circle the sky, and then fly to my position, while replying to the control coordinate list. At this time, the data of the intercepted coordinate field will be forwarded to the drone controller, such as List: y.1 x.3 y.9 x.2..... When the drone receives the coordinate list, it will perform tasks according to the coordinate data in the list. Eventually, it will fly to our position, but make sure that the battery is sufficient. All of this does not require cloud servers and cloud service APIs. You can also communicate without using the public network. We can run repeater broadcast hotspots on old computers and Android phones.

All processes maintain military encryption security standards. You can deploy the repeater by yourself and turn on the storage, and observe the changes of data in the store to confirm the security standards.

I modified it on the basis of Gun's design concept. It does not fully depend on the consensus mechanism. Instead, through Gun incremental snapshot data to the local independent form, block and block data are classified and archived through self-increasing keys. This will improve the performance of data indexing, because Gun is a graph database, which is sorted by msgId, which will encounter some trouble when the data volume is large and the data relationship is too complex. At the same time, further improve the stability of data. Sometimes the truth may be distorted, but we only trust private snapshot data. This is a friendly module for model training data. At the same time, you can easily migrate training data and address book chat records and other data. This is the design of point-to-point data. 

Channel data depends on Gun's powerful content addressing and multicast mechanism. This gives TalkFlow strong network self-healing capabilities and data recovery capabilities.

Modular as possible - repeater module - AI communication bridge module - basic chat application module - Internet of Things controller module

There are more! Forgive me for not more time to write a description! Because there are more designs that have not been completed!


# Quick Start 

iOS:

AppStore:TalkFlow

https://apps.apple.com/us/app/talkflow/id6736827124

https://apps.apple.com/cn/app/talkflow/id6736827124

MacOS&Windows client:

install dep
```base
yarn install
```
start
```base
yarn tauri dev
```
build the installation package
```base
yarn tauri build
```

Run Gun-Relay&Ollama

```base
cd gun-ollama
```
install dep
```base
yarn install
```
start
```base
node start.js
```


![win](https://github.com/user-attachments/assets/6edc4642-7928-4b6c-b5bf-a67cbe13e97d)

![20250418124625](https://github.com/user-attachments/assets/a3618b86-3902-46cf-a066-d9d110dbbdf8)



# composables
You only need to pay attention to the implementation of LisenChat and SentChat when expanding the controller.

```base
listenChat(pubKey: string)
const chatId = generateChatId(myPub, pubKey);
```

```base
sendChat(messageType: MessageType, payload: string | null = null, duration?: number)
```

# Used library

Vue

Vite

GunJs

Gun-Vue

Gun-Vue/relay

gun-avatar

OllamaJs

Tauri

capacitor

ionic

threeJs

cordova

ffmpeg

...

# Explanation of open source

I can't make all the artificial intelligence and Internet of Things controllers by myself. If you are interested in decentralized artificial intelligence tools, please submit PR. If TalkFlow is sponsored, all the funds obtained will be distributed equally to all TalkFlow contributors. The sponsor's avatar and name will be added to the iOS app and warehouse documents and our website. 
X:@GuoaiZ11355 

Thanks to Mark and Davay for their help and guidance. They are my teachers, my idols, and my best friends.

You can build any decentralized artificial intelligence application on the basis of this code warehouse. Of course, it would be better if you are willing to share your efforts with the open source community or submit PR! This will accelerate the development of decentralized forces!











