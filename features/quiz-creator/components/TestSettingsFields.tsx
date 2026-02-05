import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Field,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from '@/components/ui/input-group';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestSettingsFieldsProps {
    form: any; // Using any for now to avoid complex TanStack types, can be refined later
}

export function TestSettingsFields({ form }: TestSettingsFieldsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Global Test Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <form.Field name="title">
                        {(field: any) => (
                            <Field>
                                <FieldLabel htmlFor={field.name}>Test Title</FieldLabel>
                                <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="e.g. Introduction to Solar System"
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="description">
                        {(field: any) => (
                            <Field>
                                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                                <Textarea
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="Describe what students will learn from this test..."
                                    rows={3}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <form.Field name="duration">
                            {(field: any) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>Duration (minutes)</FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            id={field.name}
                                            type="number"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(Number(e.target.value))}
                                        />
                                        <InputGroupAddon>
                                            <InputGroupText>min</InputGroupText>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>

                        <form.Field name="scheduledDate">
                            {(field: any) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>Publication Date</FieldLabel>
                                    <DatePicker
                                        id={field.name}
                                        date={field.state.value}
                                        setDate={(date) => field.handleChange(date as Date)}
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
