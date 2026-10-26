import { useState } from 'react';
import { Pressable as NativePressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

// React Native's Pressable, for styles written as ({ pressed }) => [...].
// NativeWind wraps Pressable on phones and drops function styles there (cards
// lose their background and layout), so this tracks "pressed" itself and
// always passes a plain style. Pressables styled with className or a plain
// style can keep using the one from react-native.
export default function Pressable({ style, onPressIn, onPressOut, ...props }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <NativePressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={typeof style === 'function' ? style({ pressed }) : style}
    />
  );
}
