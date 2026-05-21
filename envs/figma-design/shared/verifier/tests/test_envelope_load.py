from figma_eval.envelope_normalize import normalize_envelope_on_load


def test_normalize_converts_component_instance_type():
    env = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": [
                        {
                            "id": "I3",
                            "type": "COMPONENT_INSTANCE",
                            "name": "Inst",
                            "mainComponentId": "C1",
                        }
                    ],
                }
            ],
        }
    }
    out = normalize_envelope_on_load(env)
    inst = out["document"]["children"][0]["children"][0]
    assert inst["type"] == "INSTANCE"
