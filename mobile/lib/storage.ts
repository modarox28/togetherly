import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};

export const SESSION_KEYS = {
  username: "togetherly-username",
  character: "togetherly-character",
  roomName: "togetherly-room-name",
};
