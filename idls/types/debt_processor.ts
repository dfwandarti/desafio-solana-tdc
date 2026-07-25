/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/debt_processor.json`.
 */
export type DebtProcessor = {
  "address": "12RNZJUaef67voHzcrQ7nXYrTyrCUKb7gVeZDyTjDeqx",
  "metadata": {
    "name": "debtProcessor",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initPlateCatalog",
      "discriminator": [
        118,
        27,
        198,
        38,
        192,
        92,
        111,
        168
      ],
      "accounts": [
        {
          "name": "admin",
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
            ]
          }
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
          "name": "debts",
          "type": {
            "vec": {
              "defined": {
                "name": "debtInput"
              }
            }
          }
        }
      ]
    },
    {
      "name": "initializeProtocolCounter",
      "discriminator": [
        194,
        214,
        112,
        143,
        247,
        228,
        225,
        27
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
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
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "processPayment",
      "discriminator": [
        189,
        81,
        30,
        198,
        139,
        186,
        115,
        23
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
            ]
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
            ]
          }
        },
        {
          "name": "receipt",
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
            ]
          }
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
  "accounts": [
    {
      "name": "plateDebtCatalog",
      "discriminator": [
        167,
        253,
        233,
        79,
        250,
        214,
        45,
        168
      ]
    },
    {
      "name": "protocolCounter",
      "discriminator": [
        119,
        23,
        204,
        199,
        153,
        202,
        252,
        131
      ]
    },
    {
      "name": "receipt",
      "discriminator": [
        39,
        154,
        73,
        106,
        80,
        102,
        145,
        153
      ]
    }
  ],
  "events": [
    {
      "name": "debtsPaid",
      "discriminator": [
        219,
        112,
        213,
        16,
        70,
        156,
        209,
        41
      ]
    },
    {
      "name": "plateCatalogInitialized",
      "discriminator": [
        185,
        177,
        4,
        59,
        147,
        42,
        114,
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
      "name": "invalidDebtCount",
      "msg": "A catalog must have between 1 and 3 debts"
    },
    {
      "code": 6002,
      "name": "invalidSelectionCount",
      "msg": "Selection must be exactly 1 or 2 debts"
    },
    {
      "code": 6003,
      "name": "duplicateDebtSelection",
      "msg": "Duplicate debt id in selection"
    },
    {
      "code": 6004,
      "name": "debtNotFound",
      "msg": "Debt id not found in catalog"
    },
    {
      "code": 6005,
      "name": "debtAlreadyPaid",
      "msg": "Debt already paid"
    },
    {
      "code": 6006,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
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
      "name": "debtInput",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "debtsPaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plate",
            "type": "string"
          },
          {
            "name": "protocolNumber",
            "type": "u64"
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "debtIds",
            "type": "bytes"
          },
          {
            "name": "totalValue",
            "type": "u64"
          },
          {
            "name": "paidAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "paidDebtRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "debtId",
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
          }
        ]
      }
    },
    {
      "name": "plateCatalogInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plate",
            "type": "string"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "debtCount",
            "type": "u8"
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
    },
    {
      "name": "receipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "protocolNumber",
            "type": "u64"
          },
          {
            "name": "plate",
            "type": "string"
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "paidDebts",
            "type": {
              "vec": {
                "defined": {
                  "name": "paidDebtRecord"
                }
              }
            }
          },
          {
            "name": "totalValue",
            "type": "u64"
          },
          {
            "name": "paidAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "receiptStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "receiptStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "paid"
          }
        ]
      }
    }
  ]
};
