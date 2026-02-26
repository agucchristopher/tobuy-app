import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';
import React from 'react';

/**
 * ‘widget’ directive tells Expo UI compiler that this file contains a widget
 */
'widget';

type TopItem = {
    name: string;
    total: number;
    qty: number;
};

export default createWidget('TopExpensiveWidget', (props: { items?: TopItem[] }) => {
    const { items = [] } = props;

    return (
        <VStack modifiers={[padding({ all: 16 }), background('#FFFFFF')]}>
            <Text modifiers={[font({ family: 'headline' }), foregroundStyle('#1A1A1A'), padding({ bottom: 12 })]}>
                Top 5 Expensive
            </Text>

            <VStack spacing={8}>
                {items.length === 0 ? (
                    <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>No pending items found.</Text>
                ) : (
                    items.map((item, index) => (
                        <HStack key={index}>
                            <Text modifiers={[font({ size: 14 }), foregroundStyle('#1A1A1A'), lineLimit(1)]}>
                                {item.name} {item.qty > 1 ? `(x${item.qty})` : ''}
                            </Text>
                            <Spacer />
                            <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#007AFF')]}>
                                ${item.total.toFixed(2)}
                            </Text>
                        </HStack>
                    ))
                )}
            </VStack>
        </VStack>
    );
});
