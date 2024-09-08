import {logic} from "../src/mainLogic";

test('test main logic', () => {
    expect(logic("test",1)).toBe("test_updated_1")
});