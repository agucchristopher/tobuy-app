import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import Storage from './lib/secureStore';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const { widgetAction } = props;

    if (
        widgetAction === 'WIDGET_ADDED' ||
        widgetAction === 'WIDGET_UPDATE' ||
        widgetAction === 'WIDGET_RESIZED'
    ) {
        let items: any[] = [];
        try {
            const savedItems = await Storage.getItem('tobuy_items');
            if (savedItems) items = JSON.parse(savedItems);
        } catch (e) {
            console.log('Error loading items in widget', e);
        }

        // Sort items by price desc and take top 5
        const topItems = items
            .filter(item => !item.bought)
            .sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity))
            .slice(0, 5);

        props.renderWidget(<TopExpensiveWidget items={topItems} />);
    }
}

function TopExpensiveWidget({ items }: { items: any[] }) {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                justifyContent: 'flex_start',
                alignItems: 'flex_start',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
            }}
        >
            <TextWidget
                text="Top 5 Expensive"
                style={{
                    fontSize: 16,
                    fontFamily: 'sans-serif-bold',
                    color: '#1A1A1A',
                    marginBottom: 12,
                }}
            />

            {items.length === 0 ? (
                <TextWidget text="No pending items found." style={{ fontSize: 13, color: '#8E8E93', marginTop: 8 }} />
            ) : (
                <FlexWidget
                    style={{
                        width: 'match_parent',
                        flexDirection: 'column',
                    }}
                >
                    {items.map((item, i) => {
                        const total = item.price * item.quantity;
                        return (
                            <FlexWidget
                                key={i}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space_between',
                                    alignItems: 'center',
                                    width: 'match_parent',
                                    marginBottom: 8,
                                }}
                            >
                                <FlexWidget style={{ flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
                                    <TextWidget
                                        text={item.name}
                                        style={{ fontSize: 14, color: '#1A1A1A', maxLines: 1 }}
                                    />
                                    {item.quantity > 1 && (
                                        <TextWidget
                                            text={` (x${item.quantity})`}
                                            style={{ fontSize: 12, color: '#8E8E93' }}
                                        />
                                    )}
                                </FlexWidget>
                                <TextWidget
                                    text={`$${total.toFixed(2)}`}
                                    style={{ fontSize: 14, color: '#007AFF', fontFamily: 'sans-serif-medium' }}
                                />
                            </FlexWidget>
                        );
                    })}
                </FlexWidget>
            )}
        </FlexWidget>
    );
}
