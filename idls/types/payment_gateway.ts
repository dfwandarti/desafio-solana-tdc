/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/payment_gateway.json`.
 */
export type PaymentGateway = {
  "address": "ANvzcQ5NXzbmCUf2jyK74154axCQheV7iVFKkNyhwcoi",
  "metadata": {
    "name": "paymentGateway",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "payDebts",
      "discriminator": [
        136,
        84,
        183,
        223,
        73,
        205,
        134,
        179
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "plateCatalog",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  101,
                  95,
                  99,
                  97,
                  116,
                  97,
                  108,
                  111,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "plate"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                0,
                93,
                35,
                80,
                98,
                229,
                163,
                136,
                187,
                39,
                141,
                157,
                239,
                232,
                237,
                160,
                11,
                126,
                181,
                118,
                248,
                206,
                78,
                152,
                50,
                29,
                182,
                65,
                243,
                175,
                72,
                11
              ]
            }
          }
        },
        {
          "name": "protocolCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                0,
                93,
                35,
                80,
                98,
                229,
                163,
                136,
                187,
                39,
                141,
                157,
                239,
                232,
                237,
                160,
                11,
                126,
                181,
                118,
                248,
                206,
                78,
                152,
                50,
                29,
                182,
                65,
                243,
                175,
                72,
                11
              ]
            }
          }
        },
        {
          "name": "receipt",
          "docs": [
            "inside the CPI. We only derive the address to forward."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "protocolCounter.nextProtocolNumber",
                "account": "protocolCounter"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                0,
                93,
                35,
                80,
                98,
                229,
                163,
                136,
                187,
                39,
                141,
                157,
                239,
                232,
                237,
                160,
                11,
                126,
                181,
                118,
                248,
                206,
                78,
                152,
                50,
                29,
                182,
                65,
                243,
                175,
                72,
                11
              ]
            }
          }
        },
        {
          "name": "debtProcessorProgram",
          "address": "12RNZJUaef67voHzcrQ7nXYrTyrCUKb7gVeZDyTjDeqx"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "plate",
          "type": "string"
        },
        {
          "name": "debtIds",
          "type": "bytes"
        }
      ]
    }
  ],
  "events": [
    {
      "name": "paymentInitiated",
      "discriminator": [
        195,
        111,
        101,
        250,
        70,
        223,
        39,
        62
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPlate",
      "msg": "Plate must be 1-7 characters"
    },
    {
      "code": 6001,
      "name": "invalidSelectionCount",
      "msg": "Selection must be exactly 1 or 2 debts"
    }
  ],
  "types": [
    {
      "name": "debtEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u8"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "debtKind"
              }
            }
          },
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "paid",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "debtKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "ipva"
          },
          {
            "name": "licensing"
          },
          {
            "name": "fine"
          }
        ]
      }
    },
    {
      "name": "paymentInitiated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plate",
            "type": "string"
          },
          {
            "name": "debtIds",
            "type": "bytes"
          },
          {
            "name": "payer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "plateDebtCatalog",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "plate",
            "type": "string"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "debts",
            "type": {
              "vec": {
                "defined": {
                  "name": "debtEntry"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "protocolCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "nextProtocolNumber",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
