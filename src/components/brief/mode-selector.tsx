"use client"

import { DetailedBriefForm } from "@/components/brief/detailed-brief-form"
import { SimpleBriefForm } from "@/components/brief/simple-brief-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ModeSelector() {
  return (
    <Tabs defaultValue="simple" className="space-y-4">
      <TabsList>
        <TabsTrigger value="simple">Simple</TabsTrigger>
        <TabsTrigger value="detailed">Detailed</TabsTrigger>
      </TabsList>
      <TabsContent value="simple">
        <SimpleBriefForm />
      </TabsContent>
      <TabsContent value="detailed">
        <DetailedBriefForm />
      </TabsContent>
    </Tabs>
  )
}
