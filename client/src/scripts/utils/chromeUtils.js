/* eslint-disable no-undef */
import { mapReportData } from '../mapReportData.js';


/**
 * Retrieves the image source URL for a given image name.
 *
 * @param {string} name - The name of the image.
 * @returns {string} The image source URL.
 */
export function getImgSrc(name){
    //return chrome.runtime.getURL('/images/' + name + '.png');
}

/**
 * Opens the options page by sending a message to the background script.
 */
export function openOptionsPage(){
    chrome.runtime.sendMessage({action: "openOptionsPage"});
}

/**
 * Retrieves a value from Chrome storage.
 * @param {string} key - The key to retrieve the value for.
 * @param {boolean} [isSync=true] - Indicates whether to use the sync storage or local storage. Default is sync storage.
 * @returns {Promise<any>} A promise that resolves with the retrieved value.
 */
export function getFromChromeStorage(key, isSync = true) {
    /**
    return new Promise((resolve) => {
        chrome.storage[isSync ? 'sync' : 'local'].get(key, (result) => {
            resolve(result[key]);
        });
    });
    */
    return new Promise((resolve) => {
        try {
            const serializedValue = localStorage.getItem(key);
            console.log(key + " " + serializedValue);
            resolve(serializedValue);
        } catch (error) {
            console.error(`Error getting value from localStorage: ${error.message}`);
            return null;
        }
    })
}

/**
 * Stores a value in Chrome storage.
 * @param {string} key - The key to store the value under.
 * @param {any} value - The value to store.
 * @param {boolean} [sync=false] - Indicates whether to use the sync storage or local storage. Default is local storage.
 */
export function storeOnChromeStorage(key, value, sync = false){
    /**
    let obj = {};
    obj[key] = value;
    chrome.storage[sync ? "sync" : "local"].set(obj);
    */
    /**
    const obj = {};
    obj[key] = value;
    localStorage.setItem(key, JSON.stringify(obj));
    */
    try {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
        console.log(`Value set successfully for key: ${key}`);
    } catch (error) {
        console.error(`Error setting value to localStorage: ${error.message}`);
    }
}

/**
 * Removes a value from Chrome storage.
 * @param {string} key - The key to remove from storage.
 * @param {boolean} [sync=false] - Indicates whether to remove the value from sync storage or local storage. Default is local storage.
 */
export function removeFromChromeStorage(key, sync = false) {
    /**
    chrome.storage[sync ? "sync" : "local"].remove(key);
    */
    localStorage.removeItem(key);
}

/**
 * Adds an element to the blacklist and updates the storage.
 * @param {any} newListElement - The element to add to the blacklist.
 * @returns {Promise<void>} A promise that resolves when the blacklist is updated.
 */
export async function blackListElement(newListElement) {

    if(!window.confirm("Blacklist selected evaluator message?\n(You can remove blacklisted elements from the configuration)")){
        return;
    } 

    const blacklist = await getFromChromeStorage("blacklist") ?? [];
    blacklist.push(newListElement);

    chrome.storage.sync.set({ blacklist }, async () => { 
        mapReportData(null, blacklist); 
    });

}