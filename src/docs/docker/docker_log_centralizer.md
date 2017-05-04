#Docker log centralizer
This a end-to-end log centralizer powered by the ELK stask.

##Embedded containers

 1. [Filebeat](https://www.elastic.co/products/beats/filebeat) - An agent to poll logs
 2. [Logstash-Forwarder](https://github.com/elastic/logstash-forwarder) - An other agent to poll logs
 3. [Logstash](https://www.elastic.co/products/logstash) - The collector / analyzer / parser solution
 4. [Kafka](http://kafka.apache.org) - The queueing solution for logs
 5. [ZooKeeper](https://zookeeper.apache.org/) - The cluster on which Kafka is running
 6. [ElasticSearch](https://www.elastic.co/products/elasticsearch) - The indexing engine
 7. [Kibana](https://www.elastic.co/products/kibana) - The visualization / dashboard tool for ElasticSearch
 8. [Kafka Manager](https://github.com/yahoo/kafka-manager) - The Kafka cluster web manager
 9. [Apache log generator](https://github.com/Febbweiss/docker-apache-log-generator) - A container generating fake apache logs
 10. [Random log generator](https://hub.docker.com/r/davidmccormick/random_log_generator) - A container genrating text logs (Star Wars quotes)

##How it works

There are 2 agent types :

 - Filebeat
 - Logstash-Forward

These agents push logs (from the apache and random generators) to a Logstasth shipper filling a Kafka queue (one type of log for one topic). 
A Logstash indexer polls the Kafka topics indexing logs into a ElasticSearch.

A short schema :
```
Agent -> Logstach shipper -> Kafka <- Logstash indexer -> ElasticSearch
```

##Tools access

Kibana is available at http://localhost:5601.
Kafka Manager is available at http://localhost:9000

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-fork-ribbon-css/0.2.0/gh-fork-ribbon.min.css" />
<!--[if lt IE 9]>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-fork-ribbon-css/0.2.0/gh-fork-ribbon.ie.min.css" />
<![endif]-->
 <a class="github-fork-ribbon" href="https://github.com/Febbweiss/docker-log-centralizer" target="_blank" title="Fork me on GitHub">Fork me on GitHub</a>