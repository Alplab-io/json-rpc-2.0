import "mocha";
import { expect } from "chai";
import {
  jsonRPCClient,
  JSONRPCClient,
  JSONRPC,
  JSONRPCResponse,
  JSONRPCRequest
} from ".";

describe("JSONRPCClient", () => {
  let client: JSONRPCClient;

  let id: number;
  let lastRequest: JSONRPCRequest;
  let resolve: () => void;
  let reject: (error: any) => void;

  beforeEach(() => {
    id = 0;
    lastRequest = undefined;
    resolve = undefined;
    reject = undefined;

    client = jsonRPCClient(
      () => ++id,
      request => {
        lastRequest = request;
        return new Promise((givenResolve, givenReject) => {
          resolve = givenResolve;
          reject = givenReject;
        });
      }
    );
  });

  describe("requesting", () => {
    let result: any;
    let error: any;
    let promise: PromiseLike<void>;

    beforeEach(() => {
      result = undefined;
      error = undefined;

      promise = client
        .request("foo", ["bar"])
        .then(
          givenResult => (result = givenResult),
          givenError => (error = givenError)
        );
    });

    it("should send the request", () => {
      expect(lastRequest).to.deep.equal({
        jsonrpc: JSONRPC,
        id,
        method: "foo",
        params: ["bar"]
      });
    });

    describe("succeeded on client side", () => {
      beforeEach(() => {
        resolve();
      });

      describe("and succeeded on server side too", () => {
        let response: JSONRPCResponse;

        beforeEach(() => {
          response = {
            jsonrpc: JSONRPC,
            id,
            result: "foo"
          };

          client.receive(response);

          return promise;
        });

        it("should resolve the result", () => {
          expect(result).to.equal(response.result);
        });
      });

      describe("but failed on server side", () => {
        let response: JSONRPCResponse;

        beforeEach(() => {
          response = {
            jsonrpc: JSONRPC,
            id,
            error: {
              code: 0,
              message: "This is a test. Do not panic."
            }
          };

          client.receive(response);

          return promise;
        });

        it("should reject with the error message", () => {
          expect(error.message).to.equal(response.error.message);
        });
      });

      describe("but server responded invalid response", () => {
        describe("like having both result and error", () => {
          let response: JSONRPCResponse;

          beforeEach(() => {
            response = {
              jsonrpc: JSONRPC,
              id,
              result: "foo",
              error: {
                code: 0,
                message: "bar"
              }
            };

            client.receive(response);

            return promise;
          });

          it("should reject", () => {
            expect(error).to.not.be.undefined;
          });
        });

        describe("like not having both result and error", () => {
          let response: JSONRPCResponse;

          beforeEach(() => {
            response = {
              jsonrpc: JSONRPC,
              id
            };

            client.receive(response);

            return promise;
          });

          it("should reject", () => {
            expect(error).to.not.be.undefined;
          });
        });
      });
    });

    describe("failed on client side", () => {
      let expected: Error;

      beforeEach(() => {
        expected = new Error("This is a test. Do not panic.");

        reject(expected);

        return promise;
      });

      it("should reject the promise", () => {
        expect(error).to.equal(expected);
      });
    });
  });

  describe("notifying", () => {
    beforeEach(() => {
      client.notify("foo", ["bar"]);
    });

    it("should send the notification", () => {
      expect(lastRequest).to.deep.equal({
        jsonrpc: JSONRPC,
        method: "foo",
        params: ["bar"]
      });
    });
  });
});
