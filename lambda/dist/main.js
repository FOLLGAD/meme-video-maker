"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
// Create client outside of handler to reuse
const lambda = new AWS.Lambda();
// Handler
exports.handler = function (event) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(event);
        try {
            let accountSettings = yield getAccountSettings();
            console.log(accountSettings);
        }
        catch (error) {
            console.log(error);
        }
    });
};
// Use SDK client
var getAccountSettings = function () {
    return lambda.getAccountSettings().promise();
};
